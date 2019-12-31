.PHONY: init build-base build unitest test deploy
PROJ?=diablo
PACKAGES = $(shell go list ./... | grep -v vendor )
PWD=$(shell pwd)

init:
	sed -i '' -e "s|diablo|${PROJ}|g" `grep -rl diablo * | grep -v Makefile | grep -v README`

build-base:
	cd images; docker build -t gobuild:1.9.4-alpine -f Dockerfile.base .

build:
	GO111MODULE=on GOPROXY=https://athens.acp.alauda.cn CGO_ENABLED=0 GOOS=linux go build -ldflags "-w -s" -v -o ${PWD}/dist/backend

compress:
	upx dist/backend

apply-license:
	kubectl apply -f deploy/license.yaml

build-dev:
	GO111MODULE=on GOPROXY=https://athens.acp.alauda.cn GO_ENABLED=0 go build -v -o ${PWD}/dist/backend

test:
	GO111MODULE=on GOPROXY=https://athens.acp.alauda.cn go test -v `go list ./... | grep -v /vendor/`

build-image: build
	cd dist; cp ../images/Dockerfile . ; docker build -t diablo .
	rm dist/Dockerfile

run: build-image
	docker run --name diablo --net host --rm -p 9091 -v ${HOME}/.kube/config:/config  diablo /backend --kubeconfig=/config --port=9091

run-dev: apply-license build-dev run-dev-no-build

run-dev-no-build:
	cp -r swagger-ui dist/
	./dist/backend /backend --kubeconfig=${HOME}/.kube/config --insecure-port=9091

run-dev-no-auth: apply-license build-dev
	cp -r swagger-ui dist/
	./dist/backend /backend --kubeconfig=${HOME}/.kube/config --insecure-port=9091 --enable-anonymous=true --logtostderr=true --v=5

setup-kubectl:
	kubectl config use-context docker-for-desktop

clean:
	rm -rf .tmp
	rm -rf dist/*

deploy:
	kubectl apply -f deploy/backend.yaml

update: build-image
	kubectl delete pod -n alauda-system -lapp=diablo
	sleep 5
	kubectl logs -f deployment/diablo -n alauda-system

build-in-docker:
	docker build -t diablo-in-docker -f images/Dockerfile.build ../..

import-cc:
	govendor update catalog-controller/pkg/apis/...
	govendor update catalog-controller/pkg/client/...

import-app-core:
	govendor update alauda.io/app-core/pkg/app/...

import-api:
	govendor update alauda.io/devops-apiserver/pkg/...

test-result:
	go test -cover -v ./... -json > test.json

test-result-debug:
	go test -cover -v ./...

cover-result:
	go test -v -coverprofile=coverage-all.out ./...

cover-result-old:
	echo "mode: count" > coverage-all.out
	@$(foreach pkg,$(PACKAGES),\
		go test -v -coverprofile=coverage.out -covermode=count $(pkg);\
		if [ -f coverage.out ]; then\
			tail -n +2 coverage.out >> coverage-all.out;\
		fi;)
