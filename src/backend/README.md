# Backend Starter

Backend 的快速启动程序，用来搭建基于 Kubernetes 的 UI API 层，并提供 Webserver 的功能

## Build

为了go modules能够下载bitbucket私有仓库的代码需要在本地设置 git 配置来用ssh （并且用key来访问bitbucket）
git config --global url."git@bitbucket.org:".insteadOf "https://bitbucket.org/"

## Quick Start

1. 将 alauda-ui-starter 目录复制到 $GOPATH 下
2. 将目录重命名为项目名例如: project
3. 进入 project/src/backend 修改 Makefile 中的 PROJ 为项目名 make init

## 包含依赖

* Go 1.12
* go-restful 1.2
* client-go 9.0.0

## TODO

* 和 frontend 结合
* 去除无用代码
* 完善测试
