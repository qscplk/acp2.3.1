import sys
import os
import random
import time

class PrepareTestData:

    def __init__(self):
        self.templateApp = os.getcwd() + '/alauda.appcore_app.yaml'
        self.templateProject = os.getcwd() + '/alauda.project.yaml'
        self.projectName = None

        self.projectCount = int(os.getenv("PROJECT_COUNT", '1'))
        self.appCount = int(os.getenv("APP_COUNT", '5'))
        self.testImage = os.getenv("TEST_IMAGE", 'index.alauda.cn/alaudaorg/qaimages:helloworld')
        self.every_few_seconds = int(os.getenv("EVERY_FEW_SECONDS", '10'))

    '''
    get random test data
    '''
    def randomTestData(self, prefix):
        time.sleep(0.1)
        t = time.time()
        nowTime = lambda:int(round(t * 1000))
        return 'auto-' + prefix + str(nowTime())

    '''
    create project
    '''
    def createProject(self):
        yaml = None
        self.projectName = self.randomTestData('project-name')
        # read yaml template
        with open(self.templateProject, 'r') as f:
            yaml = f.read()
            yaml = yaml.replace('${PROJECT_NAME}', self.projectName)
    
        # write yaml file
        with open('temp.yaml', 'w') as fnew:
            fnew.write(yaml)
        print os.system('kubectl apply -f temp.yaml')
      
    '''
    create app
    '''
    def createApp(self):
        yaml = ''
        # read yaml template
        with open(self.templateApp, 'r') as f:
            yaml = f.read().replace('${NAME}', self.randomTestData('name'))
            yaml = yaml.replace('${PROJECT_NAME}', self.projectName)
            yaml = yaml.replace('${LABEL}', self.randomTestData('label'))
            yaml = yaml.replace('${IMAGE}', self.testImage)
    
        # write yaml file
        with open('temp.yaml', 'w') as fnew:
            fnew.write(yaml)
        print os.system('kubectl apply -f temp.yaml')
        time.sleep(self.every_few_seconds)
            
    def create(self):
        for i in range(0, self.projectCount):
            self.createProject()
            for j in range(0, self.appCount):
                self.createApp()
            

testData = PrepareTestData()
testData.create()