# Diablo, Alauda Devops

![diablo](diablo.jpg)

此项目由alauda-ui-starter fork而来。

LICENSE: https://bitbucket.org/mathildetech/pass/src/master/

## Feature Gate

文档: http://confluence.alauda.cn/pages/viewpage.action?pageId=54853992


## debug

自动颜色区分，允许自定义过滤的log库，生产环境可以通过在浏览器控制台中输入localStorage.debug = 【fliter Expression]启用相应的log

### usage

```Typescript
import debug from 'debug';
const log = debug('code-quality:api:');

log('some log text');

/*
  filter example:
  localStorage.debug = 'code-quality:*';
  localStorage.debug = 'code-quality:api:*';
  localStorage.debug = 'code-quality:*|async-data:*'
*/
```

## ```pure``` Pipe

相对于直接调用组件方法transform数据，使用```pure``` Pipe可以避免不必要的重新计算

```Typescript
// component 

@Input() status = 'OK';

statusColor(text: string): string {
    switch (text) {
      case 'OK':
        return '#fff,#1bb393';
      case 'WARN':
        return '#fff,#f8ac58';
      case 'ERROR':
        return '#fff,#eb6262';
      default:
        return '';
    }
  }
```

```Html
<!-- template -->

<aui-tag [color]="status | pure:statusColor">status</aui-tag>

```
