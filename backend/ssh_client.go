package main

import (
	"bytes"
	"fmt"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

// ReadFileContent reads a file either locally or from a remote host via SSH
func ReadFileContent(host *HostServer, path string) (string, error) {
	if isLocal(host) {
		content, err := os.ReadFile(path)
		if err != nil {
			return "", fmt.Errorf("local read error: %w", err)
		}
		return string(content), nil
	}

	// Remote read via SSH
	client, err := getSSHClient(host)
	if err != nil {
		return "", fmt.Errorf("ssh connect error: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return "", fmt.Errorf("ssh session error: %w", err)
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	// Using cat to read file content
	cmd := fmt.Sprintf("cat %s", shellQuote(path))
	err = session.Run(cmd)
	if err != nil {
		return "", fmt.Errorf("ssh read command failed: %v, stderr: %s", err, stderr.String())
	}

	return stdout.String(), nil
}

// WriteFileContent writes a file either locally or to a remote host via SSH
func WriteFileContent(host *HostServer, path string, content string) error {
	if isLocal(host) {
		err := os.WriteFile(path, []byte(content), 0644)
		if err != nil {
			return fmt.Errorf("local write error: %w", err)
		}
		return nil
	}

	// Remote write via SSH
	client, err := getSSHClient(host)
	if err != nil {
		return fmt.Errorf("ssh connect error: %w", err)
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		return fmt.Errorf("ssh session error: %w", err)
	}
	defer session.Close()

	var stderr bytes.Buffer
	session.Stderr = &stderr
	session.Stdin = strings.NewReader(content)

	// Write content using cat redirect
	cmd := fmt.Sprintf("cat > %s", shellQuote(path))
	err = session.Run(cmd)
	if err != nil {
		return fmt.Errorf("ssh write command failed: %v, stderr: %s", err, stderr.String())
	}

	return nil
}

func isLocal(host *HostServer) bool {
	if host == nil {
		return true
	}
	ip := strings.ToLower(strings.TrimSpace(host.IP))
	return ip == "" || ip == "localhost" || ip == "127.0.0.1"
}

func getSSHClient(host *HostServer) (*ssh.Client, error) {
	port := host.Port
	if port <= 0 {
		port = 22
	}

	config := &ssh.ClientConfig{
		User: host.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(host.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", host.IP, port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return nil, err
	}

	return client, nil
}

func shellQuote(s string) string {
	// Escape single quotes for use inside shell single quotes
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
}
