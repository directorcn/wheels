# HTML parser

## Define state

可以在 [WHATWG](https://whatwg.org/) [html standard](https://html.spec.whatwg.org/multipage/) 13.2.5 节 Tokenization 找到, 大概 80 种状态吧, 这里忽略了 DOCTYPE CDATA Comment 以及其他一些状态, 后面应该还会加入 script data 进行完善

## Parse tag

* startTag

* endTag

* selfClosingTag

## Create element

状态迁移；标签结束状态提交标签 `Token`，emitToken

## Process attributes

跟标签类似，属性结束时把属性加到标签 `Token` 上

##   Construct tree

任何元素的父元素是它入栈前的栈顶

`selfClosingTag` 可以视为入栈后即出栈

遇到 `startTag` 创建元素 (处理 `tagName` `attributes`) 并入栈(非 `selfClosingTag`)，挂到栈顶的 `children`

遇到 `endTag` 出栈

![animation](https://directorcn.github.io/links/static/images/wheel/v1-construct-tree.gif)

## Process textNode



