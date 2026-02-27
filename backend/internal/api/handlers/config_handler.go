package handlers

import (
	"net/http"

	"github.com/firewall-manager/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type ConfigHandler struct {
	svc service.ConfigService
	log *logrus.Logger
}

func NewConfigHandler(svc service.ConfigService, log *logrus.Logger) *ConfigHandler {
	return &ConfigHandler{svc: svc, log: log}
}

func (h *ConfigHandler) GetConfig(c *gin.Context) {
	cfg, err := h.svc.GetConfig(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("get config failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

func (h *ConfigHandler) UpdateConfig(c *gin.Context) {
	var dto service.ConfigUpdateDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg, err := h.svc.UpdateConfig(c.Request.Context(), dto)
	if err != nil {
		h.log.WithError(err).Error("update config failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"config": cfg})
}

// InterfaceHandler handles network interface operations
type InterfaceHandler struct {
	svc service.InterfaceService
	log *logrus.Logger
}

func NewInterfaceHandler(svc service.InterfaceService, log *logrus.Logger) *InterfaceHandler {
	return &InterfaceHandler{svc: svc, log: log}
}

func (h *InterfaceHandler) List(c *gin.Context) {
	interfaces, err := h.svc.ListInterfaces(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("list interfaces failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"interfaces": interfaces})
}

func (h *InterfaceHandler) Create(c *gin.Context) {
	var dto service.CreateInterfaceDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	iface, err := h.svc.CreateInterface(c.Request.Context(), dto)
	if err != nil {
		h.log.WithError(err).Error("create interface failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"interface": iface})
}

func (h *InterfaceHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var dto service.UpdateInterfaceDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	iface, err := h.svc.UpdateInterface(c.Request.Context(), id, dto)
	if err != nil {
		h.log.WithError(err).Error("update interface failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"interface": iface})
}

func (h *InterfaceHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteInterface(c.Request.Context(), id); err != nil {
		h.log.WithError(err).Error("delete interface failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// ZoneHandler handles zone operations
type ZoneHandler struct {
	svc service.ZoneService
	log *logrus.Logger
}

func NewZoneHandler(svc service.ZoneService, log *logrus.Logger) *ZoneHandler {
	return &ZoneHandler{svc: svc, log: log}
}

func (h *ZoneHandler) List(c *gin.Context) {
	zones, err := h.svc.ListZones(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("list zones failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zones": zones})
}

func (h *ZoneHandler) Create(c *gin.Context) {
	var dto service.CreateZoneDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	zone, err := h.svc.CreateZone(c.Request.Context(), dto)
	if err != nil {
		h.log.WithError(err).Error("create zone failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"zone": zone})
}

func (h *ZoneHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var dto service.UpdateZoneDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	zone, err := h.svc.UpdateZone(c.Request.Context(), id, dto)
	if err != nil {
		h.log.WithError(err).Error("update zone failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"zone": zone})
}

func (h *ZoneHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteZone(c.Request.Context(), id); err != nil {
		h.log.WithError(err).Error("delete zone failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

// NATRuleHandler handles NAT rule operations
type NATRuleHandler struct {
	svc service.NATRuleService
	log *logrus.Logger
}

func NewNATRuleHandler(svc service.NATRuleService, log *logrus.Logger) *NATRuleHandler {
	return &NATRuleHandler{svc: svc, log: log}
}

func (h *NATRuleHandler) List(c *gin.Context) {
	rules, err := h.svc.ListNATRules(c.Request.Context())
	if err != nil {
		h.log.WithError(err).Error("list nat rules failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"natRules": rules})
}

func (h *NATRuleHandler) Create(c *gin.Context) {
	var dto service.CreateNATRuleDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule, err := h.svc.CreateNATRule(c.Request.Context(), dto)
	if err != nil {
		h.log.WithError(err).Error("create nat rule failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"natRule": rule})
}

func (h *NATRuleHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var dto service.UpdateNATRuleDTO
	if err := c.BindJSON(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rule, err := h.svc.UpdateNATRule(c.Request.Context(), id, dto)
	if err != nil {
		h.log.WithError(err).Error("update nat rule failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"natRule": rule})
}

func (h *NATRuleHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteNATRule(c.Request.Context(), id); err != nil {
		h.log.WithError(err).Error("delete nat rule failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
