# Simple Webpack

## 准备工作

```bash
npm i -S @babel/core @babel/parser @babel/traverse
```

* `{parse} = @babel/parser`：生成 AST

* `{default:traverse} = @babel/traverse`：分析模块之间的依赖关系

* `{transformFromAST} = @babel/core`：将 AST 重新生成源码

## 定义类及方法

* Complier

    * run 

    > 构建启动

    * buildModule

    * generateFiles

* Parser

    * getAST

    > 生成 AST

    * getDependencies

    > 找出依赖的模块

    * transform

    > AST 转 code
