package gaia

import (
	"errors"
	"net/http"
	"net/url"
	"os"

	"github.com/faabiosr/cachego/file"
	"github.com/fastwego/dingding"
	"github.com/flipped-aurora/gin-vue-admin/server/global"
	"github.com/flipped-aurora/gin-vue-admin/server/model/gaia"
	"github.com/flipped-aurora/gin-vue-admin/server/utils"
	"github.com/google/uuid"
)

type SystemIntegratedService struct{}

// GetIntegratedConfig
// @Tags System Integrated
// @Summary 获取系统集成配置
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
func (e *SystemIntegratedService) GetIntegratedConfig(classID uint) (integrate gaia.SystemIntegration) {
	// classID是否在
	var err error
	if err = global.GVA_DB.Where("classify = ?", classID).First(&integrate).Error; err != nil {
		integrate = gaia.SystemIntegration{
			Classify: classID,
			Status:   false,
		}
		// 创建相关集成信息
		global.GVA_DB.Create(&integrate)
	}
	// 隐藏部分加密信息
	var secret string
	if secret, err = utils.DecryptBlowfish(integrate.AppSecret, global.GVA_CONFIG.JWT.SigningKey); err == nil {
		integrate.AppSecret = utils.AddAsteriskToString(secret)
	}
	integrate.CorpID = utils.AddAsteriskToString(integrate.CorpID)
	return integrate
}

// SetIntegratedConfig
// @Tags System Integrated
// @Summary 设置系统集成配置
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
func (e *SystemIntegratedService) SetIntegratedConfig(integrate gaia.SystemIntegration, test bool) (err error) {
	// classID是否在
	var log gaia.SystemIntegration
	if err = global.GVA_DB.Where("classify = ?", integrate.Classify).First(&log).Error; err != nil {
		return err
	}
	// AppSecret
	var secret string
	if secret, err = utils.DecryptBlowfish(log.AppSecret, global.GVA_CONFIG.JWT.SigningKey); err == nil {
		encodeSecret := utils.AddAsteriskToString(secret)
		if encodeSecret != integrate.AppSecret {
			if secret, err = utils.EncryptBlowfish(
				[]byte(integrate.AppSecret), global.GVA_CONFIG.JWT.SigningKey); err != nil {
				return errors.New("AppSecret加密失败")
			}
			// save
			log.AppSecret = secret
		} else {
			// 为什么不用 integrate.AppSecret, 被加*了
			if secret, err = utils.DecryptBlowfish(log.AppSecret, global.GVA_CONFIG.JWT.SigningKey); err != nil {
				return errors.New("AppSecret解析失败")
			}
			integrate.AppSecret = secret
		}
	}
	// CorpID
	var ding *dingding.Client
	if utils.AddAsteriskToString(log.CorpID) != integrate.CorpID {
		log.CorpID = integrate.CorpID
	}
	// AppID 不加密，直接赋值
	log.AppID = integrate.AppID
	// 关闭不需要请求
	if integrate.Status || test {
		if ding, err = e.DingTalkConfigAvailable(integrate); err != nil {
			return errors.New("钉钉链接失败" + err.Error())
		}
		// token
		if _, err = ding.AccessTokenManager.GetAccessToken(); err != nil {
			return errors.New("钉钉token获取失败:" + err.Error())
		}
	}
	// Test completed
	if test {
		return err
	}
	// save
	if err = global.GVA_DB.Model(&gaia.SystemIntegration{}).Where("id=?", log.Id).Updates(&map[string]interface{}{
		"status":     integrate.Status,
		"agent_id":   integrate.AgentID,
		"app_key":    integrate.AppKey,
		"app_secret": log.AppSecret,
		"corp_id":    log.CorpID,
		"app_id":     log.AppID,
	}).Error; err != nil {
		return err
	}
	return nil
}

// DingTalkConfigAvailable
// @Tags System Integrated
// @Summary 测试钉钉配置是否可用
// @Security ApiKeyAuth
// @accept application/json
// @Produce application/json
// @param: req gaia.SystemIntegration
// @return: *dingding.Client, error
func (e *SystemIntegratedService) DingTalkConfigAvailable(req gaia.SystemIntegration) (*dingding.Client, error) {
	var err error
	var reqs *http.Request
	dingding.ServerUrl = "https://api.dingtalk.com"
	// 特殊需要，检查可用性就不设置缓存了
	return dingding.NewClient(&dingding.DefaultAccessTokenManager{
		Id:    uuid.New().String(),
		Cache: file.New(os.TempDir()),
		Name:  "x-acs-dingtalk-access-token",
		GetRefreshRequestFunc: func() *http.Request {
			params := url.Values{}
			params.Add("appkey", req.AppKey)
			params.Add("appsecret", req.AppSecret)
			reqs, err = http.NewRequest(http.MethodGet, "https://oapi.dingtalk.com/gettoken?"+params.Encode(), nil)
			return reqs
		},
	}), err
}
