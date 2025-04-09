import time
import logging  # ---------------------二开部分  密钥额度限制 ---------------------
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Optional

from flask import current_app, request
from flask_login import user_logged_in  # type: ignore
from flask_restful import Resource  # type: ignore
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from werkzeug.exceptions import Forbidden, Unauthorized

from controllers.service_api.app.error_extend import (
    AccountNoMoneyErrorExtend,
    ApiTokenDayNoMoneyErrorExtend,
    ApiTokenMonthNoMoneyErrorExtend,
)
from extensions.ext_database import db
from extensions.ext_redis import redis_client
from libs.login import _get_user
from models.account import Account, Tenant, TenantAccountJoin, TenantStatus, TenantAccountRole # 二开部分  额度限制，API调用计费，新增TenantAccountRole
from models.dataset import RateLimitLog
from models.account_money_extend import AccountMoneyExtend
from models.api_token_money_extend import (
    ApiTokenMoneyExtend,  # 二开部分  密钥额度限制
)
from models.model import ApiToken, App, EndUser
from models.model_extend import (
    EndUserAccountJoinsExtend,  # 二开部分  额度限制，API调用计费
)
from services.feature_service import FeatureService


class WhereisUserArg(Enum):
    """
    Enum for whereis_user_arg.
    """

    QUERY = "query"
    JSON = "json"
    FORM = "form"


class FetchUserArg(BaseModel):
    fetch_from: WhereisUserArg
    required: bool = False


def validate_app_token(view: Optional[Callable] = None, *, fetch_user_arg: Optional[FetchUserArg] = None):
    def decorator(view_func):
        @wraps(view_func)
        def decorated_view(*args, **kwargs):
            api_token = validate_and_get_api_token("app")

            app_model = db.session.query(App).filter(App.id == api_token.app_id).first()
            if not app_model:
                raise Forbidden("The app no longer exists.")

            if app_model.status != "normal":
                raise Forbidden("The app's status is abnormal.")

            if not app_model.enable_api:
                raise Forbidden("The app's API service has been disabled.")

            tenant = db.session.query(Tenant).filter(Tenant.id == app_model.tenant_id).first()
            if tenant is None:
                raise ValueError("Tenant does not exist.")
            if tenant.status == TenantStatus.ARCHIVE:
                raise Forbidden("The workspace's status is archived.")

            # ---------------------二开部分Begin  额度限制，API调用计费 ---------------------
            tenantAccountJoin = (
                db.session.query(TenantAccountJoin)
                .filter(
                    TenantAccountJoin.tenant_id == app_model.tenant_id,
                    TenantAccountJoin.role == TenantAccountRole.OWNER,
                )
                .first()
            )
            if not tenantAccountJoin:
                raise Forbidden("The workspace has not owner")

            # TODO 需要写入缓存，读缓存
            account_money = (
                db.session.query(AccountMoneyExtend)
                .filter(AccountMoneyExtend.account_id == tenantAccountJoin.account_id)
                .first()
            )
            if account_money and account_money.used_quota >= account_money.total_quota:
                raise AccountNoMoneyErrorExtend()

            # 密钥额度判断
            kwargs["api_token"] = api_token  # API token消息数据传递下去
            api_token_money = (
                db.session.query(ApiTokenMoneyExtend).filter(ApiTokenMoneyExtend.app_token_id == api_token.id).first()
            )
            if api_token_money:
                if (
                    api_token_money.day_limit_quota != -1
                    and api_token_money.day_used_quota >= api_token_money.day_limit_quota
                ):
                    raise ApiTokenDayNoMoneyErrorExtend()
                if (
                    api_token_money.month_limit_quota != -1
                    and api_token_money.month_used_quota >= api_token_money.month_limit_quota
                ):
                    raise ApiTokenMonthNoMoneyErrorExtend()
            else:
                logging.warning("数据异常，该密钥没有额度数据: %s", api_token.id)
            # ---------------------二开部分End  额度限制，API调用计费 ---------------------

            kwargs["app_model"] = app_model

            if fetch_user_arg:
                if fetch_user_arg.fetch_from == WhereisUserArg.QUERY:
                    user_id = request.args.get("user")
                elif fetch_user_arg.fetch_from == WhereisUserArg.JSON:
                    user_id = request.get_json().get("user")
                elif fetch_user_arg.fetch_from == WhereisUserArg.FORM:
                    user_id = request.form.get("user")
                else:
                    # use default-user
                    user_id = None

                if not user_id and fetch_user_arg.required:
                    raise ValueError("Arg user must be provided.")

                if user_id:
                    user_id = str(user_id)

                kwargs["end_user"] = create_or_update_end_user_for_user_id(app_model, user_id)

                # ---------------------二开部分Begin  额度限制，API调用计费 ---------------------
                if kwargs.get("end_user"):
                    create_or_update_end_user_account_join_extend(
                        kwargs["end_user"].id, tenantAccountJoin.account_id, app_model.id
                    )
                # ---------------------二开部分End  额度限制，API调用计费 ---------------------

            return view_func(*args, **kwargs)

        return decorated_view

    if view is None:
        return decorator
    else:
        return decorator(view)


def cloud_edition_billing_resource_check(resource: str, api_token_type: str):
    def interceptor(view):
        def decorated(*args, **kwargs):
            api_token = validate_and_get_api_token(api_token_type)
            features = FeatureService.get_features(api_token.tenant_id)

            if features.billing.enabled:
                members = features.members
                apps = features.apps
                vector_space = features.vector_space
                documents_upload_quota = features.documents_upload_quota

                if resource == "members" and 0 < members.limit <= members.size:
                    raise Forbidden("The number of members has reached the limit of your subscription.")
                elif resource == "apps" and 0 < apps.limit <= apps.size:
                    raise Forbidden("The number of apps has reached the limit of your subscription.")
                elif resource == "vector_space" and 0 < vector_space.limit <= vector_space.size:
                    raise Forbidden("The capacity of the vector space has reached the limit of your subscription.")
                elif resource == "documents" and 0 < documents_upload_quota.limit <= documents_upload_quota.size:
                    raise Forbidden("The number of documents has reached the limit of your subscription.")
                else:
                    return view(*args, **kwargs)

            return view(*args, **kwargs)

        return decorated

    return interceptor


def cloud_edition_billing_knowledge_limit_check(resource: str, api_token_type: str):
    def interceptor(view):
        @wraps(view)
        def decorated(*args, **kwargs):
            api_token = validate_and_get_api_token(api_token_type)
            features = FeatureService.get_features(api_token.tenant_id)
            if features.billing.enabled:
                if resource == "add_segment":
                    if features.billing.subscription.plan == "sandbox":
                        raise Forbidden(
                            "To unlock this feature and elevate your Dify experience, please upgrade to a paid plan."
                        )
                else:
                    return view(*args, **kwargs)

            return view(*args, **kwargs)

        return decorated

    return interceptor


def cloud_edition_billing_rate_limit_check(resource: str, api_token_type: str):
    def interceptor(view):
        @wraps(view)
        def decorated(*args, **kwargs):
            api_token = validate_and_get_api_token(api_token_type)

            if resource == "knowledge":
                knowledge_rate_limit = FeatureService.get_knowledge_rate_limit(api_token.tenant_id)
                if knowledge_rate_limit.enabled:
                    current_time = int(time.time() * 1000)
                    key = f"rate_limit_{api_token.tenant_id}"

                    redis_client.zadd(key, {current_time: current_time})

                    redis_client.zremrangebyscore(key, 0, current_time - 60000)

                    request_count = redis_client.zcard(key)

                    if request_count > knowledge_rate_limit.limit:
                        # add ratelimit record
                        rate_limit_log = RateLimitLog(
                            tenant_id=api_token.tenant_id,
                            subscription_plan=knowledge_rate_limit.subscription_plan,
                            operation="knowledge",
                        )
                        db.session.add(rate_limit_log)
                        db.session.commit()
                        raise Forbidden(
                            "Sorry, you have reached the knowledge base request rate limit of your subscription."
                        )
            return view(*args, **kwargs)

        return decorated

    return interceptor


def validate_dataset_token(view=None):
    def decorator(view):
        @wraps(view)
        def decorated(*args, **kwargs):
            api_token = validate_and_get_api_token("dataset")
            tenant_account_join = (
                db.session.query(Tenant, TenantAccountJoin)
                .filter(Tenant.id == api_token.tenant_id)
                .filter(TenantAccountJoin.tenant_id == Tenant.id)
                .filter(TenantAccountJoin.role.in_(["owner"]))
                .filter(Tenant.status == TenantStatus.NORMAL)
                .one_or_none()
            )  # TODO: only owner information is required, so only one is returned.
            if tenant_account_join:
                tenant, ta = tenant_account_join
                account = db.session.query(Account).filter(Account.id == ta.account_id).first()
                # Login admin
                if account:
                    account.current_tenant = tenant
                    current_app.login_manager._update_request_context_with_user(account)  # type: ignore
                    user_logged_in.send(current_app._get_current_object(), user=_get_user())  # type: ignore
                else:
                    raise Unauthorized("Tenant owner account does not exist.")
            else:
                raise Unauthorized("Tenant does not exist.")
            return view(api_token.tenant_id, *args, **kwargs)

        return decorated

    if view:
        return decorator(view)

    # if view is None, it means that the decorator is used without parentheses
    # use the decorator as a function for method_decorators
    return decorator


def validate_and_get_api_token(scope: str | None = None):
    """
    Validate and get API token.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header is None or " " not in auth_header:
        raise Unauthorized("Authorization header must be provided and start with 'Bearer'")

    auth_scheme, auth_token = auth_header.split(None, 1)
    auth_scheme = auth_scheme.lower()

    if auth_scheme != "bearer":
        raise Unauthorized("Authorization scheme must be 'Bearer'")

    current_time = datetime.now(UTC).replace(tzinfo=None)
    cutoff_time = current_time - timedelta(minutes=1)
    with Session(db.engine, expire_on_commit=False) as session:
        update_stmt = (
            update(ApiToken)
            .where(
                ApiToken.token == auth_token,
                (ApiToken.last_used_at.is_(None) | (ApiToken.last_used_at < cutoff_time)),
                ApiToken.type == scope,
            )
            .values(last_used_at=current_time)
            .returning(ApiToken)
        )
        result = session.execute(update_stmt)
        api_token = result.scalar_one_or_none()

        if not api_token:
            stmt = select(ApiToken).where(ApiToken.token == auth_token, ApiToken.type == scope)
            api_token = session.scalar(stmt)
            if not api_token:
                raise Unauthorized("Access token is invalid")
        else:
            session.commit()

    return api_token


def create_or_update_end_user_for_user_id(app_model: App, user_id: Optional[str] = None) -> EndUser:
    """
    Create or update session terminal based on user ID.
    """
    if not user_id:
        user_id = "DEFAULT-USER"

    end_user = (
        db.session.query(EndUser)
        .filter(
            EndUser.tenant_id == app_model.tenant_id,
            EndUser.app_id == app_model.id,
            EndUser.session_id == user_id,
            EndUser.type == "service_api",
        )
        .first()
    )

    if end_user is None:
        end_user = EndUser(
            tenant_id=app_model.tenant_id,
            app_id=app_model.id,
            type="service_api",
            is_anonymous=user_id == "DEFAULT-USER",
            session_id=user_id,
        )
        db.session.add(end_user)
        db.session.commit()

    return end_user


# ---------------------二开部分Begin  额度限制，API调用计费 ---------------------
def create_or_update_end_user_account_join_extend(end_user_id, account_id, app_id: str) -> EndUserAccountJoinsExtend:
    # 插入节点账号id和用户账号id关联关系，以方便扣钱查询
    end_user_account_join = (
        db.session.query(EndUserAccountJoinsExtend)
        .filter(EndUserAccountJoinsExtend.end_user_id == end_user_id, EndUserAccountJoinsExtend.app_id == app_id)
        .first()
    )

    if end_user_account_join is None:
        end_user_account_join = EndUserAccountJoinsExtend(end_user_id=end_user_id, account_id=account_id, app_id=app_id)
        db.session.add(end_user_account_join)
    db.session.commit()

    return end_user_account_join


# ---------------------二开部分End 额度限制，API调用计费 ---------------------


class DatasetApiResource(Resource):
    method_decorators = [validate_dataset_token]
