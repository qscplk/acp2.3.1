import sys
import os
import random
import time
import datetime
import json


class MonitorAcp:

    def __init__(self):
        self.count = int(os.getenv("MONITOR_COUNT", '60'))
        self.every_few_seconds = int(os.getenv("EVERY_FEW_SECONDS", '10'))
        self.cmd = str(os.getenv("CURL_MONITOR", 'curl https://94.191.102.25/console/api/v1/overview/ --insecure -H "accept-encoding: gzip, deflate, br" --compressed -H "authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImQ3OGU0ZTk1NzI5NTBmMDM1NGRjYWRjMzQ0M2ZkYzNkNTk1MzA5MTkifQ.eyJpc3MiOiJodHRwczovLzk0LjE5MS4xMDIuMjUvZGV4Iiwic3ViIjoiQ2lRd09HRTROamcwWWkxa1lqZzRMVFJpTnpNdE9UQmhPUzB6WTJReE5qWXhaalUwTmpZU0JXeHZZMkZzIiwiYXVkIjoiYWxhdWRhLWF1dGgiLCJleHAiOjE1NDM1ODQxMzQsImlhdCI6MTU0MzQ5NzczNCwibm9uY2UiOiJybmciLCJhdF9oYXNoIjoiUHlGYVJSbEp2emYyYm04T1hxczBzZyIsImVtYWlsIjoiYWRtaW5AYWxhdWRhLmlvIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJhZG1pbiIsImV4dCI6eyJpc19hZG1pbiI6dHJ1ZSwiY29ubl9pZCI6ImxvY2FsIn19.GcsnhRHgqUN1jz0w3f02PVI4hjKRMflgTNxApeQghF7-3VI6ZB8HDhRcOz4zrLgY2w6e212KZFThoVVwEl0NbWDYeAc0wAoh_a1zTA2brBxpEGy_bK2Hr1KsRjxFUbWT2zUE8sG6YWur8DmYwmv7T5_Zzzu38JZKbKmsGFtifyb0hk1zGEIpX6oyiZ_Ub5M7sOBksTWNVb5a9XMpLnMtFagsgzh6aSWck9LPGhYbLQm4V3bua87myMhDtZflhkIwWsRS4Jt2PVlgONY9bOz1EpSlhauoAPIa_7MPGUZjQjbWCCJkOLB5bchdTzNUjMamNdM1S6ofihf7Z8Hh3taxxA"'))

    '''
    create project
    '''
    def getStatus(self):
        startTime = datetime.datetime.now()
        p=os.popen(self.cmd)
        yaml = p.read()
        endTime = datetime.datetime.now()
        self.responseTime = str((endTime-startTime).total_seconds())
        podinfo = None
        try:
            podinfo = json.loads(str(yaml))
        except Exception as e:
            print 'failed: not json format after exec ' + self.cmd
            print 'response: ' + yaml
        return podinfo
    def _initStatus(self,name, filename):
        infor = self.getStatus()[name]
        title = 'time,'
        for key in infor:
            if key.find('requestMem') > -1 or key.find('totalMem') > -1:
                title = title + key + '(MB),'
            elif key.find('requestCpu') > -1 or key.find('totalCpu') > -1:
                title = title + key + '(m),'
            elif key.find('metrics') > -1:
                title = title + key + '-cpu(m),'
                title = title + key + '-memory(MB),'
            else:
                title = title + key + ','
        title += 'responseTime'
        os.system('echo \'' + title + '\'>' + filename)

    def getItemStatus(self, name, filename):
        infor = self.getStatus()[name]

        result = str(datetime.datetime.now()) + ','
        for key in infor:
            if key.find('requestMem') > -1 or key.find('totalMem') > -1:
                result += str(infor[key]/1048576) + ','
            elif key.find('metrics') > -1:
                result = result + str(infor[key]['cpu']) + ','
                result = result + str(infor[key]['memory']/1048576) + ','
            else:
                result += str(infor[key]) + ','
        result += self.responseTime
        os.system('echo \'' + result + '\'>>' + filename)

    def initMonitor(self):
        os.system('rm -rf ' + os.getcwd() + '/monitorResourceStatus.txt')
        os.system('rm -rf ' + os.getcwd() + '/monitorNode.txt')
        os.system('rm -rf ' + os.getcwd() + '/monitorPod.txt')
        os.system('rm -rf ' + os.getcwd() + '/monitorDeployment.txt')
        os.system('rm -rf ' + os.getcwd() + '/monitorDaemonSet.txt')
        os.system('rm -rf ' + os.getcwd() + '/monitorStateful.txt')

        self._initStatus('resourceStatus', os.getcwd() + '/monitorResourceStatus.txt')
        self._initStatus('nodeStatus', os.getcwd() + '/monitorNode.txt')
        self._initStatus('podStatus', os.getcwd() + '/monitorPod.txt')
        self._initStatus('deploymentStatus', os.getcwd() + '/monitorDeployment.txt')
        self._initStatus('daemonSetStatus', os.getcwd() + '/monitorDaemonSet.txt')
        self._initStatus('statefulSetStatus', os.getcwd() + '/monitorStateful.txt') 

    def monitor(self):
        self.initMonitor()

        for i in range(0, self.count):
            time.sleep(self.every_few_seconds)
            try:
                self.getItemStatus('nodeStatus', os.getcwd() + '/monitorNode.txt')
                self.getItemStatus('podStatus', os.getcwd() + '/monitorPod.txt')
                self.getItemStatus('deploymentStatus', os.getcwd() + '/monitorDeployment.txt')
                self.getItemStatus('daemonSetStatus', os.getcwd() + '/monitorDaemonSet.txt')
                self.getItemStatus('statefulSetStatus', os.getcwd() + '/monitorStateful.txt')
                self.getItemStatus('resourceStatus', os.getcwd() + '/monitorResourceStatus.txt')
            except Exception as e:
                print '****************'
                print e
                print '*******end*********'
                pass
                
acp = MonitorAcp()
acp.monitor()

