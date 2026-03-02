package network

import (
	"fmt"
	"net"

	"github.com/sirupsen/logrus"
	"github.com/vishvananda/netlink"
)

// Info holds details about a network interface.
type Info struct {
	Name    string
	IP      string
	Mask    string
	Gateway string
	MAC     string
	Enabled bool
}

// Driver defines the interface for network operations.
type Driver interface {
	GetInterfaces() ([]Info, error)
	ApplyConfig(ifaceName, ip, mask, gateway string, enabled bool) error
}

// NetlinkDriver provides methods to interact with network interfaces using netlink.
type NetlinkDriver struct {
	log *logrus.Logger
}

// NewNetlinkDriver creates a new NetlinkDriver.
func NewNetlinkDriver(log *logrus.Logger) *NetlinkDriver {
	return &NetlinkDriver{log: log}
}

// GetInterfaces discovers network interfaces on the system.
func (d *NetlinkDriver) GetInterfaces() ([]Info, error) {
	links, err := netlink.LinkList()
	if err != nil {
		return nil, fmt.Errorf("failed to list links: %w", err)
	}

	var interfaces []Info
	for _, link := range links {
		// Skip loopback and non-ethernet interfaces for simplicity
		if link.Attrs().Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := netlink.AddrList(link, netlink.FAMILY_V4)
		if err != nil {
			d.log.WithError(err).WithField("interface", link.Attrs().Name).Warn("failed to get addresses for interface")
		}

		info := Info{
			Name:    link.Attrs().Name,
			MAC:     link.Attrs().HardwareAddr.String(),
			Enabled: link.Attrs().Flags&net.FlagUp != 0,
		}

		if len(addrs) > 0 {
			ipNet := addrs[0].IPNet
			if ipNet != nil {
				info.IP = ipNet.IP.String()
				ones, _ := ipNet.Mask.Size()
				info.Mask = fmt.Sprintf("%d", ones)
			}
		}

		routes, err := netlink.RouteList(link, netlink.FAMILY_V4)
		if err == nil {
			for _, r := range routes {
				if r.Dst == nil && r.Gw != nil {
					info.Gateway = r.Gw.String()
					break
				}
			}
		} else {
			d.log.WithError(err).WithField("interface", link.Attrs().Name).Warn("failed to get routes for interface")
		}

		interfaces = append(interfaces, info)
	}

	return interfaces, nil
}

// ApplyConfig applies IP/mask/gateway configuration to an interface.
// NOTE: This requires the application to run with CAP_NET_ADMIN capabilities.
func (d *NetlinkDriver) ApplyConfig(ifaceName, ip, mask, gateway string, enabled bool) error {
	d.log.WithFields(logrus.Fields{
		"interface": ifaceName,
		"ip":        ip,
		"mask":      mask,
		"gateway":   gateway,
		"enabled":   enabled,
	}).Info("Applying network configuration")

	link, err := netlink.LinkByName(ifaceName)
	if err != nil {
		return fmt.Errorf("failed to find link %s: %w", ifaceName, err)
	}

	// It's safer to bring the link down before changing IP addresses
	if err := netlink.LinkSetDown(link); err != nil {
		d.log.WithError(err).Warnf("failed to set link %s down before config change", ifaceName)
	}

	// Flush existing addresses to avoid conflicts
	existingAddrs, _ := netlink.AddrList(link, netlink.FAMILY_V4)
	for _, oldAddr := range existingAddrs {
		if err := netlink.AddrDel(link, &oldAddr); err != nil {
			d.log.WithError(err).Warnf("failed to delete old address %s", oldAddr.IP.String())
		}
	}

	if ip != "" && mask != "" {
		addrStr := fmt.Sprintf("%s/%s", ip, mask)
		addr, err := netlink.ParseAddr(addrStr)
		if err != nil {
			return fmt.Errorf("failed to parse address %s: %w", addrStr, err)
		}
		if err := netlink.AddrAdd(link, addr); err != nil {
			return fmt.Errorf("failed to add address %s to %s: %w", addrStr, ifaceName, err)
		}
	}

	if enabled {
		if err := netlink.LinkSetUp(link); err != nil {
			return fmt.Errorf("failed to set link %s up: %w", ifaceName, err)
		}
	}

	if gateway != "" {
		gwIP := net.ParseIP(gateway)
		if gwIP == nil {
			return fmt.Errorf("invalid gateway IP: %s", gateway)
		}
		route := &netlink.Route{LinkIndex: link.Attrs().Index, Gw: gwIP}
		if err := netlink.RouteReplace(route); err != nil {
			return fmt.Errorf("failed to set gateway %s for %s: %w", gateway, ifaceName, err)
		}
	}

	d.log.WithField("interface", ifaceName).Info("Successfully applied network configuration")
	return nil
}
