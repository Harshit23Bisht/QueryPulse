package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/moby/moby/api/types/container"
	"github.com/moby/moby/client"
)

func runContainer() error {
	ctx := context.Background()

	cli, err := client.NewClientWithOpts(
		client.FromEnv,
		client.WithAPIVersionNegotiation(),
	)

	if err != nil {
		panic(err)
	}

	fmt.Println("[Docker] Connected")

	// Pull image
	reader, err := cli.ImagePull(
		ctx,
		"postgres:15-alpine",
		client.ImagePullOptions{},
	)

	if err != nil {
		panic(err)
	}
	io.Copy(io.Discard, reader)
	reader.Close()

	fmt.Println("[Docker] Image Pulled")

	// Create container
	resp, err := cli.ContainerCreate(
    ctx,
    client.ContainerCreateOptions{
        Config: &container.Config{
            Image: "postgres:15-alpine",
			Env: []string{
				"POSTGRES_PASSWORD=pass",
			},
        },
		HostConfig: &container.HostConfig{
			Resources: container.Resources{
				Memory: 128 * 1024 * 1024,
				NanoCPUs: 500000000,
			},
			NetworkMode: "none",
        },
    },
)

	if err != nil {
		panic(err)
	}

	fmt.Println("[Docker] Container Created")
	_ = resp

	// Start container
	_, err = cli.ContainerStart(
		ctx,
		resp.ID,
		client.ContainerStartOptions{},
	)

	if err != nil {
		panic(err)
	}

	fmt.Println("[Docker] Container Started")
	fmt.Println("Container ID:", resp.ID)
	time.Sleep(3 * time.Second)
		// Read logs
	logs, err := cli.ContainerLogs(
		ctx,
		resp.ID,
		client.ContainerLogsOptions{
			ShowStdout: true,
			ShowStderr: true,
		},
	)

	if err != nil {
		panic(err)
	}

	io.Copy(os.Stdout, logs)
	logs.Close()
	_, err = cli.ContainerStop(ctx, resp.ID, client.ContainerStopOptions{})
		// Delete container
	_, err = cli.ContainerRemove(
		ctx,
		resp.ID,
		client.ContainerRemoveOptions{
			Force: true,
		},
	)

	if err != nil {
		panic(err)
	}

	fmt.Println("[Docker] Container Removed")
	return nil
}


func executeHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("HANDLER HIT")

	err := runContainer()

	if err != nil {
		fmt.Println("Container execution failed:", err)

		http.Error(
			w,
			"container execution failed",
			http.StatusInternalServerError,
		)
		return
	}

	fmt.Fprintln(w, "container execution successful")
}


func main() {
    http.HandleFunc("/execute", executeHandler)

	fmt.Println("Go Service listening on :8081")

	err := http.ListenAndServe(":8081", nil)
	fmt.Println("SERVER ERROR:", err)
}