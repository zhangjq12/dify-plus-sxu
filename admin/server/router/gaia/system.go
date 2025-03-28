package gaia

import (
	"github.com/gin-gonic/gin"
)

type SystemRouter struct{}

// InitSystemRouter 初始化 Dify 系统 关联系统表 路由信息
func (d *SystemRouter) InitSystemRouter(Router *gin.RouterGroup) {
	dashboardRouterWithoutRecord := Router.Group("gaia/system")
	{
		dashboardRouterWithoutRecord.GET("dingtalk", systemApi.GetDingTalk)  // 获取钉钉系统配置
		dashboardRouterWithoutRecord.POST("dingtalk", systemApi.SetDingTalk) // 设置钉钉系统配置
	}
}
