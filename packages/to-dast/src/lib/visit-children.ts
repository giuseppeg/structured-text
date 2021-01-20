import { Handler, Node, HastNode, HastElementNode } from './types';
import visitNode from './visit-node';

// visitChildren() is for visiting all the children of a node
export default (async function visitChildren(createNode, parent, context) {
  const nodes: HastNode[] = Array.isArray(parent.children)
    ? parent.children
    : [];
  let values: Node[] = [];
  let index = -1;
  let result;

  while (++index < nodes.length) {
    result = await visitNode(createNode, nodes[index], {
      ...context,
      parent,
    });

    if (result) {
      values = values.concat(result);
    }
  }

  return values;
} as Handler<HastElementNode>);