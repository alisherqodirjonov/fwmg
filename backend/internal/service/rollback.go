package service

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// restoreSnapshot pipes the raw iptables-save snapshot into iptables-restore.
// This is used exclusively for rollback — no user input reaches this path.
func restoreSnapshot(snapshot string) func() error {
	return func() error {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, "/sbin/iptables-restore")
		cmd.Stdin = strings.NewReader(snapshot)

		var stderr bytes.Buffer
		cmd.Stderr = &stderr

		if err := cmd.Run(); err != nil {
			return fmt.Errorf("iptables-restore rollback failed: %w — %s", err, stderr.String())
		}
		return nil
	}
}