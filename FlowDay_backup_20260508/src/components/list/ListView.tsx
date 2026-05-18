/**
 * ListView 列表视图组件
 * 
 * 使用虚拟列表渲染大量节点数据
 */

import { useCallback, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSchedulerStore } from '../../stores/schedulerStore';
import { useEventBus } from '../../hooks/useEventBus';
import { ListToolbar } from './ListToolbar';
import { ListItem } from './ListItem';
import type { FlattenedNode } from '../../core/types';

export function ListView() {
  const schedulerManager = useSchedulerStore((s) => s.schedulerManager);
  const tagManager = useSchedulerStore((s) => s.tagManager);
  const nodes = useSchedulerStore((s) => s.nodes);  // 订阅 nodes 变化
  const canUndo = useSchedulerStore((s) => s.canUndo);
  const canRedo = useSchedulerStore((s) => s.canRedo);
  const createNode = useSchedulerStore((s) => s.createNode);
  const toggleComplete = useSchedulerStore((s) => s.toggleComplete);
  const deleteNode = useSchedulerStore((s) => s.deleteNode);
  const undo = useSchedulerStore((s) => s.undo);
  const redo = useSchedulerStore((s) => s.redo);
  
  // 本地折叠状态（独立于节点数据）
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  // 选中的节点
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  // 将树结构扁平化为列表
  const flattenedNodes = useMemo((): FlattenedNode[] => {
    const allNodes = schedulerManager.getAllNodes();
    const result: FlattenedNode[] = [];
    
    const traverse = (
      parentId: string | null,
      depth: number,
      parentVisible: boolean,
      parentCollapsed: boolean
    ) => {
      const children = allNodes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      
      for (const node of children) {
        const isCollapsed = collapsedIds.has(node.id);
        const hasChildren = allNodes.some(n => n.parentId === node.id);
        const isVisible = parentVisible && !parentCollapsed;
        
        result.push({
          id: node.id,
          node,
          depth,
          isExpanded: !isCollapsed,
          hasChildren,
          isVisible,
          parentPath: [],
          indent: depth * 24,
          isLastChild: false,
          hasVisibleChildren: hasChildren && !isCollapsed,
        });
        
        traverse(node.id, depth + 1, isVisible, isCollapsed);
      }
    };
    
    // 从根节点开始遍历（根节点深度为 0）
    traverse(null, 0, true, false);
    
    return result;
  }, [nodes, collapsedIds]);  // 依赖 nodes 确保数据变化时重新计算

  // 虚拟列表配置
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40, // 每项高度
    overscan: 10, // 预渲染数量
  });

  // 监听数据变化，重置折叠状态
  useEventBus('tree:loaded', () => {
    setCollapsedIds(new Set());
  });

  // 添加根节点
  const handleAddRoot = useCallback(() => {
    createNode(null, { title: '新日程' });
  }, [createNode]);

  // 全部展开
  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  // 全部折叠
  const handleCollapseAll = useCallback(() => {
    const allNodes = schedulerManager.getAllNodes();
    const newCollapsed = new Set<string>();
    allNodes.forEach(node => {
      if (node.id !== schedulerManager.getRootNode().id) {
        newCollapsed.add(node.id);
      }
    });
    setCollapsedIds(newCollapsed);
  }, [schedulerManager]);

  // 切换折叠状态
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 切换完成状态
  const handleToggleComplete = useCallback((id: string) => {
    toggleComplete(id);
  }, [toggleComplete]);

  // 添加子节点
  const handleAddChild = useCallback((parentId: string) => {
    createNode(parentId, { title: '新子日程' });
  }, [createNode]);

  // 编辑节点（选中后双击触发）
  const handleEdit = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // 删除节点
  const handleDelete = useCallback((id: string) => {
    if (window.confirm('确定要删除这个日程及其所有子日程吗？')) {
      deleteNode(id);
    }
  }, [deleteNode]);

  // 获取所有标签
  const allTags = useMemo(() => tagManager.getAllTags(), [tagManager]);

  return (
    <div className="w-full h-full flex flex-col">
      <ListToolbar
        onAddRoot={handleAddRoot}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
      >
        {flattenedNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            暂无日程，点击上方"添加日程"按钮开始
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map(virtualRow => {
              const item = flattenedNodes[virtualRow.index];
              return (
                <div
                  key={item.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="group"
                >
                  <ListItem
                    item={item}
                    tags={allTags}
                    onToggleCollapse={handleToggleCollapse}
                    onToggleComplete={handleToggleComplete}
                    onAddChild={handleAddChild}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selected={selectedId === item.id}
                    onSelect={setSelectedId}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
