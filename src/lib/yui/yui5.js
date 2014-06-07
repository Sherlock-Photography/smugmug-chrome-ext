/*
YUI 3.17.2 (build 9c3c78e)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("tree",function(e,t){var n=e.Lang,r="add",i="clear",s="remove",o=e.Base.create("tree",e.Base,[],{nodeClass:e.Tree.Node,nodeExtensions:[],_isYUITree:!0,_rootNodeConfig:{canHaveChildren:!0},initializer:function(e){e||(e={}),e.nodeClass&&(this.nodeClass=e.nodeClass),e.nodeExtensions&&(this.nodeExtensions=this.nodeExtensions.concat(e.nodeExtensions)),this._published||(this._published={}),this._nodeMap={},this.onceAfter("initializedChange",function(){this._composeNodeClass(),this.clear(e.rootNode,{silent:!0}),e.nodes&&this.insertNode(this.rootNode,e.nodes,{silent:!0})})},destructor:function(){this.destroyNode(this.rootNode,{silent:!0}),this.children=null,this.rootNode=null,this._nodeClass=null,this._nodeMap=null,this._published=null},appendNode:function(t,n,r){return this.insertNode(t,n,e.merge(r,{index:t.children.length,src:"append"}))},clear:function(e,t){return this._fireTreeEvent(i,{rootNode:this.createNode(e||this._rootNodeConfig),src:t&&t.src},{defaultFn:this._defClearFn,silent:t&&t.silent})},createNode:function(t){t||(t={});if(t._isYUITreeNode)return t.state.destroyed?(e.error("Cannot insert a node that has already been destroyed.",null,"tree"),null):(this._adoptNode(t),t);if(t.children){var n=[];for(var r=0,i=t.children.length;r<i;r++)n.push(this.createNode(t.children[r]));t=e.merge(t,{children:n})}var s=new this._nodeClass(this,t);return this._nodeMap[s.id]=s},destroyNode:function(e,t){var n,r,i;t||(t={});for(r=0,i=e.children.length;r<i;r++)n=e.children[r],n.parent=null,this.destroyNode(n,t);return e.parent&&this.removeNode(e,t),e.children=[],e.data={},e.state={destroyed:!0},e.tree=null,e._indexMap={},delete this._nodeMap[e.id],this},emptyNode:function(e,t){var n=e.children,r=[];for(var i=n.length-1;i>-1;--i)r[i]=this.removeNode(n[i],t);return r},findNode:function(e,t,n,r){var i=null;return typeof t=="function"&&(r=n,n=t,t={}),this.traverseNode(e,t,function(e){if(n.call(r,e))return i=e,o.STOP_TRAVERSAL}),i},getNodeById:function(e){return this._nodeMap[e]},insertNode:function(e,t,i){i||(i={}),e||(e=this.rootNode);if("length"in t&&n.isArray(t)){var s="index"in i,o=[],u;for(var a=0,f=t.length;a<f;a++)u=this.insertNode(e,t[a],i),u&&(o.push(u),s&&(i.index+=1));return o}t=this.createNode(t);if(t){var l=i.index;typeof l=="undefined"&&(l=this._getDefaultNodeIndex(e,t,i)),this._fireTreeEvent(r,{index:l,node:t,parent:e,src:i.src||"insert"},{defaultFn:this._defAddFn,silent:i.silent})}return t},prependNode:function(t,n,r){return this.insertNode(t,n,e.merge(r,{index:0,src:"prepend"}))},removeNode:function(e,t){return t||(t={}),this._fireTreeEvent(s,{destroy:!!t.destroy,node:e,parent:e.parent,src:t.src||"remove"},{defaultFn:this._defRemoveFn,silent:t.silent}),e},size:function(){return this.rootNode.size()+1},toJSON:function(){return this.rootNode.toJSON()},traverseNode:function(t,n,r,i){if(t.state.destroyed){e.error("Cannot traverse a node that has been destroyed.",null,"tree");return}typeof n=="function"&&(i=r,r=n,n={}),n||(n={});var s=o.STOP_TRAVERSAL,u=typeof n.depth=="undefined";if(r.call(i,t)===s)return s;var a=t.children;if(u||n.depth>0){var f=u?n:{depth:n.depth-1};for(var l=0,c=a.length;l<c;l++)if(this.traverseNode(a[l],f,r,i)===s)return s}},_adoptNode:function(e,t){var n=e.tree,r;if(n===this)return;for(var i=0,s=e.children.length;i<s;i++)r=e.children[i],r.parent=null,this._adoptNode(r,{silent:!0}),r.parent=e;e.parent&&n.removeNode(e,t),delete n._nodeMap[e.id];if(!(e instanceof this._nodeClass)||n._nodeClass!==this._nodeClass)e=this.createNode(e.toJSON());e.tree=this,e._isIndexStale=!0,this._nodeMap[e.id]=e},_composeNodeClass:function(){var t=this.nodeClass,n=this.nodeExtensions,r;if(typeof t=="string"){t=e.Object.getValue(e,t.split("."));if(!t){e.error("Node class not found: "+t,null,"tree");return}this.nodeClass=t}if(!n.length){this._nodeClass=t;return}r=function(){var e=r._nodeExtensions;t.apply(this,arguments);for(var n=0,i=e.length;n<i;n++)e[n].apply(this,arguments)},e.extend(r,t);for(var i=0,s=n.length;i<s;i++)e.mix(r.prototype,n[i].prototype,!0);r._nodeExtensions=n,this._nodeClass=r},_fireTreeEvent:function(e,t,n){return n&&n.silent?n.defaultFn&&(t.silent=!0,n.defaultFn.call(this,t)):(n&&n.defaultFn&&!this._published[e]&&(this._published[e]=this.publish(e,{defaultFn:n.defaultFn})),this.fire(e,t)),this},_getDefaultNodeIndex:function(e){return e.children.length},_removeNodeFromParent:function(e){var t=e.parent,n;if(t){n=t.indexOf(e);if(n>-1){var r=t.children;n===r.length-1?r.pop():(r.splice(n,1),t._isIndexStale=!0),e.parent=null}}},_defAddFn:function(e){var t=e.index,n=e.node,r=e.parent,i;if(n.parent){if(n.parent===r){i=r.indexOf(n);if(i===t)return;i<t&&(t-=1)}this.removeNode(n,{silent:e.silent,src:"add"})}n.parent=r,r.children.splice(t,0,n),r.canHaveChildren=!0,r._isIndexStale=!0},_defClearFn:function(e){var t=e.rootNode;this.rootNode&&this.destroyNode(this.rootNode,{silent:!0}),this._nodeMap={},this._nodeMap[t.id]=t,this.rootNode=t,this.children=t.children},_defRemoveFn:function(e){var t=e.node;e.destroy?this.destroyNode(t,{silent:!0}):e.parent?this._removeNodeFromParent(t):this.rootNode===t&&(this.rootNode=this.createNode(this._rootNodeConfig),this.children=this.rootNode.children)}},{STOP_TRAVERSAL:{}});e.Tree=e.mix(o,e.Tree)},"3.17.2",{requires:["base-build","tree-node"]});
/*
YUI 3.17.2 (build 9c3c78e)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("tree-labelable",function(e,t){function n(){}function r(e,t){this._serializable=this._serializable.concat("label"),"label"in t&&(this.label=t.label)}n.prototype={initializer:function(){this.nodeExtensions=this.nodeExtensions.concat(e.Tree.Node.Labelable)}},e.Tree.Labelable=n,r.prototype={label:""},e.Tree.Node.Labelable=r},"3.17.2",{requires:["tree"]});
/*
YUI 3.17.2 (build 9c3c78e)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("tree-openable",function(e,t){function i(){}function s(){}var n="close",r="open";i.prototype={initializer:function(){this.nodeExtensions=this.nodeExtensions.concat(e.Tree.Node.Openable)},closeNode:function(e,t){return e.canHaveChildren&&e.isOpen()&&this._fireTreeEvent(n,{node:e,src:t&&t.src},{defaultFn:this._defCloseFn,silent:t&&t.silent}),this},openNode:function(e,t){return e.canHaveChildren&&!e.isOpen()&&this._fireTreeEvent(r,{node:e,src:t&&t.src},{defaultFn:this._defOpenFn,silent:t&&t.silent}),this},toggleOpenNode:function(e,t){return e.isOpen()?this.closeNode(e,t):this.openNode(e,t)},_defCloseFn:function(e){delete e.node.state.open},_defOpenFn:function(e){e.node.state.open=!0}},e.Tree.Openable=i,s.prototype={close:function(e){return this.tree.closeNode(this,e),this},isOpen:function(){return!!this.state.open||this.isRoot()},open:function(e){return this.tree.openNode(this,e),this},toggleOpen:function(e){return this.tree.toggleOpenNode(this,e),this}},e.Tree.Node.Openable=s},"3.17.2",{requires:["tree"]});
/*
YUI 3.17.2 (build 9c3c78e)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("tree-selectable",function(e,t){function s(){}function o(){}var n=e.Do,r="select",i="unselect";s.prototype={initializer:function(){this.nodeExtensions=this.nodeExtensions.concat(e.Tree.Node.Selectable),this._selectedMap={},n.after(this._selectableAfterDefAddFn,this,"_defAddFn"),n.after(this._selectableAfterDefClearFn,this,"_defClearFn"),n.after(this._selectableAfterDefRemoveFn,this,"_defRemoveFn"),this._selectableEvents=[this.after("multiSelectChange",this._afterMultiSelectChange)]},destructor:function(){(new e.EventHandle(this._selectableEvents)).detach(),this._selectableEvents=null,this._selectedMap=null},getSelectedNodes:function(){return e.Object.values(this._selectedMap)},selectNode:function(e,t){return this._selectedMap[e.id]||this._fireTreeEvent(r,{node:e,src:t&&t.src},{defaultFn:this._defSelectFn,silent:t&&t.silent}),this},unselect:function(e){for(var t in this._selectedMap)this._selectedMap.hasOwnProperty(t)&&this.unselectNode(this._selectedMap[t],e);return this},unselectNode:function(e,t){return(e.isSelected()||this._selectedMap[e.id])&&this._fireTreeEvent(i,{node:e,src:t&&t.src},{defaultFn:this._defUnselectFn,silent:t&&t.silent}),this},_selectableAfterDefAddFn:function(e){e.node.isSelected()&&this.selectNode(e.node)},_selectableAfterDefClearFn:function(){this._selectedMap={}},_selectableAfterDefRemoveFn:function(e){delete e.node.state.selected,delete this._selectedMap[e.node.id]},_afterMultiSelectChange:function(){this.unselect()},_defSelectFn:function(e){this.get("multiSelect")||this.unselect(),e.node.state.selected=!0,this._selectedMap[e.node.id]=e.node},_defUnselectFn:function(e){delete e.node.state.selected,delete this._selectedMap[e.node.id]}},s.ATTRS={multiSelect:{value:!1}},e.Tree.Selectable=s,o.prototype={isSelected:function(){return!!this.state.selected},select:function(e){return this.tree.selectNode(this,e),this},unselect:function(e){return this.tree.unselectNode(this,e),this}},e.Tree.Node.Selectable=o},"3.17.2",{requires:["tree"]});
/*
YUI 3.17.2 (build 9c3c78e)
Copyright 2014 Yahoo! Inc. All rights reserved.
Licensed under the BSD License.
http://yuilibrary.com/license/
*/

YUI.add("tree-sortable",function(e,t){function r(){}function i(){}var n="sort";r.prototype={sortReverse:!1,initializer:function(t){this.nodeExtensions=this.nodeExtensions.concat(e.Tree.Node.Sortable),t&&(t.sortComparator&&(this.sortComparator=t.sortComparator),"sortReverse"in t&&(this.sortReverse=t.sortReverse))},sort:function(t){return this.sortNode(this.rootNode,e.merge(t,{deep:!0}))},sortComparator:function(e){return e.index()},sortNode:function(t,r){if(!t.children.length)return this;r||(r={});if(r.deep){r=e.merge(r,{deep:!1});var i=this;return this.traverseNode(t,function(e){i.sortNode(e,r)}),this}var s=this._getSortComparator(t,r),o;return"sortReverse"in r?o=t.sortReverse=r.sortReverse:"sortReverse"in t?o=t.sortReverse:o=this.sortReverse,t.children.sort(e.rbind(this._sort,this,s,o)),t._isIndexStale=!0,r.silent||this.fire(n,{node:t,reverse:!!o,src:r.src}),this},_compare:function(e,t){return e<t?-1:e>t?1:0},_compareReverse:function(e,t){return t<e?-1:t>e?1:0},_getDefaultNodeIndex:function(e,t){var n=e.children,i=this._getSortComparator(e),s=n.length,o=0,u="sortReverse"in e?e.sortReverse:this.sortReverse;if(!s)return s;if(i._unboundComparator===r.prototype.sortComparator)return u?0:s;var a=u?this._compareReverse:this._compare,f=i(t),l;while(o<s)l=o+s>>1,a(i(n[l]),f)<0?o=l+1:s=l;return o},_getSortComparator:function(e,t){var n,r,i;return t&&t.sortComparator?r=e.sortComparator=t.sortComparator:e.sortComparator?(r=e.sortComparator,i=e):(r=this.sortComparator,i=this),n=function(){return r.apply(i,arguments)},n._unboundComparator=r,n},_sort:function(e,t,n,r){return this[r?"_compareReverse":"_compare"](n(e),n(t))}},e.Tree.Sortable=r,i.prototype={sort:function(e){return this.tree.sortNode(this,e),this}},e.Tree.Node.Sortable=i},"3.17.2",{requires:["tree"]});
