import { useState } from 'react'
import type { Category } from '../api'

function Node({ node, onSelect }: { node: Category; onSelect: (id: number) => void }) {
  const [open, setOpen] = useState(true)
  const hasChildren = !!node.children && node.children.length > 0
  return (
    <li>
      <div className="tree-item">
        {hasChildren && (
          <button className="tree-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse' : 'Expand'}>
            {open ? '▾' : '▸'}
          </button>
        )}
        <button className="tree-label" onClick={() => onSelect(node.id)}>{node.name}</button>
      </div>
      {hasChildren && open && (
        <ul className="tree-children">
          {node.children!.map((child) => (
            <Node key={child.id} node={child} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function CategoryTree({ tree, onSelect, onClear }: { tree: Category[]; onSelect: (id: number) => void; onClear: () => void }) {
  return (
    <div>
      <div className="tree-header">
        <div className="tree-title">Categories</div>
        <button className="tree-clear" onClick={onClear}>Clear</button>
      </div>
      <ul className="tree-root">
        {tree.map((node) => (
          <Node key={node.id} node={node} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  )
}
