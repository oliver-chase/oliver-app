'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { Stakeholder, AppState } from '@/types'
import { today } from '@/lib/db'
import { Picker } from './Picker'

let _touchDragStkId: string | null = null
let _touchGhost: HTMLElement | null = null

function initials(name: string) {
  return name.split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2) || '?'
}

function isDescendantOf(potDesc: string, potAnc: string, stks: Stakeholder[]): boolean {
  let current: string | undefined = potDesc
  const visited = new Set<string>()
  while (current) {
    if (visited.has(current)) break
    visited.add(current)
    const stk = stks.find(s => s.stakeholder_id === current)
    if (!stk || !stk.reports_to) return false
    if (stk.reports_to === potAnc) return true
    current = stk.reports_to
  }
  return false
}

function buildEngItems(projs: AppState['projects'], opps: AppState['opportunities']): Array<{ value: string; label: string; isHeader?: boolean }> {
  const items: Array<{ value: string; label: string; isHeader?: boolean }> = [{ value: '', label: 'Account-wide' }]
  const sp = [...projs].sort((a, b) => a.project_name.localeCompare(b.project_name))
  if (sp.length) { items.push({ value: '__h_proj', label: 'PROJECTS', isHeader: true }); sp.forEach(p => items.push({ value: p.project_id, label: p.project_name })) }
  const so = [...opps].sort((a, b) => (a.description || '').localeCompare(b.description || ''))
  if (so.length) { items.push({ value: '__h_opp', label: 'OPPORTUNITIES', isHeader: true }); so.forEach(o => items.push({ value: o.opportunity_id, label: o.description || o.opportunity_id })) }
  return items
}

function engDisplay(ids: string[], projs: AppState['projects'], opps: AppState['opportunities']): string {
  if (!ids.length) return 'Account-wide'
  const resolved = ids.map(id => {
    const p = projs.find(x => x.project_id === id)
    if (p) return p.project_name
    const o = opps.find(x => x.opportunity_id === id)
    return o ? (o.description || null) : null
  }).filter(Boolean) as string[]
  return resolved.length ? resolved.join(', ') : 'Account-wide'
}

interface OrgChartProps {
  accountId: string
  stakeholders: Stakeholder[]
  owners: string[]
  acctProjs: AppState['projects']
  acctOpps: AppState['opportunities']
  onUpdate: (s: Stakeholder) => Promise<void>
  onDelete: (s: Stakeholder) => void
}

export default function OrgChart({ stakeholders, owners, acctProjs, acctOpps, onUpdate, onDelete }: OrgChartProps) {
  const [zoom, setZoom] = useState(1.0)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [zone2Hover, setZone2Hover] = useState(false)
  const [kbDragId, setKbDragId] = useState<string | null>(null)
  const [detailPerson, setDetailPerson] = useState<Stakeholder | null>(null)
  const [msgToast, setMsgToast] = useState<string | null>(null)
  const msgToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const outerRef = useRef<HTMLDivElement>(null)
  const treeRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  const showMsgToast = useCallback((msg: string) => {
    setMsgToast(msg)
    clearTimeout(msgToastTimer.current)
    msgToastTimer.current = setTimeout(() => setMsgToast(null), 3000)
  }, [])

  const acctIds = new Set(stakeholders.map(s => s.stakeholder_id))
  const childMap: Record<string, string[]> = {}
  stakeholders.forEach(s => {
    if (s.reports_to && acctIds.has(s.reports_to)) {
      if (!childMap[s.reports_to]) childMap[s.reports_to] = []
      childMap[s.reports_to].push(s.stakeholder_id)
    }
  })
  const zone1Ids = new Set(stakeholders.filter(s =>
    (s.reports_to && acctIds.has(s.reports_to)) || (childMap[s.stakeholder_id]?.length > 0)
  ).map(s => s.stakeholder_id))
  const treeRoots = stakeholders.filter(s =>
    zone1Ids.has(s.stakeholder_id) && (!s.reports_to || !acctIds.has(s.reports_to))
  )
  const zone2Stks = stakeholders.filter(s => !zone1Ids.has(s.stakeholder_id))

  useEffect(() => { drawOrgLines() })

  function drawOrgLines() {
    const outer = outerRef.current
    const tree = treeRef.current
    if (!outer || !tree) return
    outer.querySelectorAll('.org-lines').forEach(s => s.remove())
    const outerRect = outer.getBoundingClientRect()
    const branches = tree.querySelectorAll('.org-branch > .org-children > .org-branch')
    const parents = new Set<Element>()
    branches.forEach(cb => {
      const p = cb.parentElement?.parentElement
      if (p?.classList.contains('org-branch')) parents.add(p)
    })
    if (!parents.size) return
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'org-lines')
    svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;z-index:10'
    svg.style.width = outer.scrollWidth + 'px'
    svg.style.height = outer.scrollHeight + 'px'
    const scrollX = outer.scrollLeft, scrollY = outer.scrollTop
    function mkPath(d: string) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', d)
      p.setAttribute('stroke', 'var(--color-border)')
      p.setAttribute('stroke-width', '2')
      p.setAttribute('fill', 'none')
      p.setAttribute('stroke-linecap', 'round')
      svg.appendChild(p)
    }
    parents.forEach(pb => {
      const parentCard = pb.querySelector(':scope > .org-node-card')
      const childrenRow = pb.querySelector(':scope > .org-children')
      if (!parentCard || !childrenRow) return
      const pRect = parentCard.getBoundingClientRect()
      const pX = pRect.left - outerRect.left + scrollX + pRect.width / 2
      const pY = pRect.top - outerRect.top + scrollY + pRect.height
      const childCards = [...childrenRow.querySelectorAll(':scope > .org-branch > .org-node-card')]
      if (!childCards.length) return
      const childRects = childCards.map(c => c.getBoundingClientRect())
      const midY = pY + (childRects[0].top - outerRect.top + scrollY - pY) / 2
      childRects.forEach(cRect => {
        const cX = cRect.left - outerRect.left + scrollX + cRect.width / 2
        const cY = cRect.top - outerRect.top + scrollY
        mkPath('M ' + pX + ' ' + pY + ' L ' + pX + ' ' + midY + ' L ' + cX + ' ' + midY + ' L ' + cX + ' ' + cY)
      })
    })
    outer.appendChild(svg)
  }

  const announce = useCallback((msg: string) => {
    const el = liveRef.current
    if (!el) return
    el.textContent = ''
    requestAnimationFrame(() => { if (liveRef.current) liveRef.current.textContent = msg })
  }, [])

  const clearKbDrag = useCallback(() => {
    setKbDragId(null)
    document.querySelectorAll('.org-node-card.kb-dragging,.org-node-card.kb-droppable').forEach(c =>
      c.classList.remove('kb-dragging', 'kb-droppable')
    )
  }, [])

  const doSetReportsTo = useCallback(async (dragId: string, targetId: string) => {
    const dragged = stakeholders.find(s => s.stakeholder_id === dragId)
    const target = stakeholders.find(s => s.stakeholder_id === targetId)
    if (!dragged || !target) return
    const updated: Stakeholder = { ...dragged, reports_to: targetId, last_updated: today() }
    if (target.department && !dragged.department) updated.department = target.department
    await onUpdate(updated)
    showMsgToast(dragged.name + ' now reports to ' + target.name)
  }, [stakeholders, onUpdate, showMsgToast])

  const doRemoveFromTree = useCallback(async (dragId: string) => {
    const dragged = stakeholders.find(s => s.stakeholder_id === dragId)
    if (!dragged || !dragged.reports_to) return
    await onUpdate({ ...dragged, reports_to: '', last_updated: today() })
  }, [stakeholders, onUpdate])

  const handleKbSpace = useCallback(async (stkId: string, isUnmapped: boolean) => {
    if (isUnmapped) return
    if (kbDragId === null) {
      setKbDragId(stkId)
      document.querySelectorAll('.org-tree .org-node-card:not([data-stkid="' + stkId + '"])').forEach(c =>
        c.classList.add('kb-droppable')
      )
      document.querySelector('.org-tree [data-stkid="' + stkId + '"]')?.classList.add('kb-dragging')
      const name = stakeholders.find(s => s.stakeholder_id === stkId)?.name || 'person'
      announce('Picked up ' + name + '. Tab to another person and press Space to set as their manager. Press Escape to cancel.')
    } else if (kbDragId === stkId) {
      clearKbDrag()
      announce('Drag cancelled')
    } else {
      if (isDescendantOf(stkId, kbDragId, stakeholders)) {
        announce('Cannot create circular reporting relationship')
        return
      }
      const draggedName = stakeholders.find(s => s.stakeholder_id === kbDragId)?.name || 'Person'
      const prevKbDragId = kbDragId
      clearKbDrag()
      await doSetReportsTo(prevKbDragId, stkId)
      announce(draggedName + ' now reports to ' + (stakeholders.find(s => s.stakeholder_id === stkId)?.name || 'person'))
    }
  }, [kbDragId, stakeholders, announce, clearKbDrag, doSetReportsTo])

  const handleKbEscape = useCallback(() => {
    if (kbDragId) { clearKbDrag(); announce('Drag cancelled') }
  }, [kbDragId, clearKbDrag, announce])

  const handleTouchDrop = useCallback(async (dragId: string, targetId: string) => {
    if (!dragId || dragId === targetId) return
    if (isDescendantOf(targetId, dragId, stakeholders)) {
      showMsgToast('Cannot create circular reporting relationship')
      return
    }
    await doSetReportsTo(dragId, targetId)
  }, [stakeholders, doSetReportsTo, showMsgToast])

  const handleTouchUnlink = useCallback(async (dragId: string) => {
    await doRemoveFromTree(dragId)
  }, [doRemoveFromTree])

  if (!stakeholders.length) return <div className="empty-state">No people yet</div>

  const deptGrouped: Record<string, Stakeholder[]> = {}
  const unlabeled: Stakeholder[] = []
  zone2Stks.forEach(s => {
    if (s.department) {
      if (!deptGrouped[s.department]) deptGrouped[s.department] = []
      deptGrouped[s.department].push(s)
    } else { unlabeled.push(s) }
  })

  return (
    <>
      {msgToast && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, background: 'var(--color-text-primary)', color: 'var(--color-text-inverse)', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', fontWeight: 600, zIndex: 300, pointerEvents: 'none' }}>
          {msgToast}
        </div>
      )}
      <div ref={liveRef} id="org-kb-live" aria-live="assertive" aria-atomic="true"
        style={{ clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', height: 1, overflow: 'hidden', position: 'absolute', whiteSpace: 'nowrap', width: 1 }} />

      <div ref={outerRef} className="org-chart-outer">
        <div className="org-zoom-controls">
          <button onClick={() => setZoom(z => parseFloat(Math.max(0.4, z - 0.1).toFixed(1)))}>&#8722;</button>
          <button onClick={() => setZoom(1.0)}>Reset</button>
          <button onClick={() => setZoom(z => parseFloat(Math.min(1.5, z + 0.1).toFixed(1)))}>+</button>
        </div>

        <div className="overview-stat-label" style={{ marginBottom: 10 }}>REPORTING STRUCTURE</div>

        <div
          ref={treeRef}
          className="org-tree"
          style={{ display: 'flex', flexDirection: 'row', gap: 48, alignItems: 'flex-start', padding: 16, transform: 'scale(' + zoom.toFixed(1) + ')' }}
        >
          {zone1Ids.size === 0 ? (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray)', fontStyle: 'italic', padding: '12px 0' }}>
              Drag people from below to build the reporting structure.
            </div>
          ) : (
            treeRoots.map(s => (
              <OrgBranch
                key={s.stakeholder_id}
                stkId={s.stakeholder_id}
                childMap={childMap}
                stakeholders={stakeholders}
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                kbDragId={kbDragId}
                onDragStart={id => setDraggedId(id)}
                onDragEnd={() => { setDraggedId(null); setDropTargetId(null) }}
                onDropTarget={setDropTargetId}
                onDropLeave={() => setDropTargetId(null)}
                onDrop={async targetId => {
                  setDropTargetId(null)
                  const did = draggedId
                  setDraggedId(null)
                  if (!did || did === targetId) return
                  if (isDescendantOf(targetId, did, stakeholders)) {
                    announce('Cannot create circular reporting relationship')
                    return
                  }
                  await doSetReportsTo(did, targetId)
                }}
                onUnlinkFromTree={doRemoveFromTree}
                onTouchDrop={handleTouchDrop}
                onTouchUnlink={handleTouchUnlink}
                onCardClick={setDetailPerson}
                onKbSpace={handleKbSpace}
                onKbEscape={handleKbEscape}
              />
            ))
          )}
        </div>

        {zone2Stks.length > 0 && (
          <div
            style={{ border: '1.5px dashed ' + (zone2Hover ? 'var(--pink)' : 'var(--border)'), borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 24 }}
            data-zone2="true"
            onDragOver={e => { e.preventDefault(); setZone2Hover(true); e.dataTransfer.dropEffect = 'move' }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setZone2Hover(false) }}
            onDrop={async e => {
              e.preventDefault()
              setZone2Hover(false)
              const did = e.dataTransfer.getData('text/plain') || draggedId
              setDraggedId(null)
              if (did) await doRemoveFromTree(did)
            }}
          >
            <div className="overview-stat-label" style={{ marginBottom: 10 }}>NOT YET PLACED &#8212; drag to assign reporting</div>

            {Object.entries(deptGrouped).map(([dept, people]) => (
              <div key={dept}>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--purple)', margin: '8px 0 4px', letterSpacing: '.05em', textTransform: 'uppercase' }}>{dept}</div>
                <div className="org-unmapped-nodes">
                  {people.map(s => (
                    <OrgNodeCard
                      key={s.stakeholder_id}
                      stk={s}
                      isUnmapped
                      draggedId={draggedId}
                      dropTargetId={null}
                      kbDragId={kbDragId}
                      onDragStart={id => setDraggedId(id)}
                      onDragEnd={() => setDraggedId(null)}
                      onDropTarget={() => {}}
                      onDropLeave={() => {}}
                      onDrop={async () => {}}
                      onUnlinkFromTree={() => Promise.resolve()}
                      onTouchDrop={handleTouchDrop}
                      onTouchUnlink={handleTouchUnlink}
                      onDeletePerson={onDelete}
                      onCardClick={setDetailPerson}
                      onKbSpace={handleKbSpace}
                      onKbEscape={handleKbEscape}
                    />
                  ))}
                </div>
              </div>
            ))}

            {unlabeled.length > 0 && (
              <div className="org-unmapped-nodes">
                {unlabeled.map(s => (
                  <OrgNodeCard
                    key={s.stakeholder_id}
                    stk={s}
                    isUnmapped
                    draggedId={draggedId}
                    dropTargetId={null}
                    kbDragId={kbDragId}
                    onDragStart={id => setDraggedId(id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDropTarget={() => {}}
                    onDropLeave={() => {}}
                    onDrop={async () => {}}
                    onUnlinkFromTree={() => Promise.resolve()}
                    onTouchDrop={handleTouchDrop}
                    onTouchUnlink={handleTouchUnlink}
                    onDeletePerson={onDelete}
                    onCardClick={setDetailPerson}
                    onKbSpace={handleKbSpace}
                    onKbEscape={handleKbEscape}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {detailPerson && (
        <PersonDetailPanel
          stk={detailPerson}
          owners={owners}
          otherPeople={stakeholders.filter(s => s.stakeholder_id !== detailPerson.stakeholder_id)}
          acctProjs={acctProjs}
          acctOpps={acctOpps}
          onSave={async s => { await onUpdate(s); setDetailPerson(s) }}
          onClose={() => setDetailPerson(null)}
        />
      )}
    </>
  )
}

interface BranchProps {
  stkId: string
  childMap: Record<string, string[]>
  stakeholders: Stakeholder[]
  draggedId: string | null
  dropTargetId: string | null
  kbDragId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropTarget: (id: string) => void
  onDropLeave: () => void
  onDrop: (targetId: string) => Promise<void>
  onUnlinkFromTree: (id: string) => Promise<void>
  onTouchDrop: (dragId: string, targetId: string) => Promise<void>
  onTouchUnlink: (dragId: string) => Promise<void>
  onCardClick: (stk: Stakeholder) => void
  onKbSpace: (id: string, isUnmapped: boolean) => Promise<void>
  onKbEscape: () => void
}

function OrgBranch({ stkId, childMap, stakeholders, onTouchDrop, onTouchUnlink, ...nodeProps }: BranchProps) {
  const stk = stakeholders.find(s => s.stakeholder_id === stkId)
  if (!stk) return null
  const children = childMap[stkId] || []
  return (
    <div className="org-branch">
      <OrgNodeCard stk={stk} isUnmapped={false} onDeletePerson={() => {}} onTouchDrop={onTouchDrop} onTouchUnlink={onTouchUnlink} {...nodeProps} />
      {children.length > 0 && (
        <div className="org-children">
          {children.map(cId => (
            <OrgBranch key={cId} stkId={cId} childMap={childMap} stakeholders={stakeholders} onTouchDrop={onTouchDrop} onTouchUnlink={onTouchUnlink} {...nodeProps} />
          ))}
        </div>
      )}
    </div>
  )
}

interface NodeCardProps {
  stk: Stakeholder
  isUnmapped: boolean
  draggedId: string | null
  dropTargetId: string | null
  kbDragId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDropTarget: (id: string) => void
  onDropLeave: () => void
  onDrop: (targetId: string) => Promise<void>
  onUnlinkFromTree: (id: string) => Promise<void>
  onTouchDrop: (dragId: string, targetId: string) => Promise<void>
  onTouchUnlink: (dragId: string) => Promise<void>
  onDeletePerson: (stk: Stakeholder) => void
  onCardClick: (stk: Stakeholder) => void
  onKbSpace: (id: string, isUnmapped: boolean) => Promise<void>
  onKbEscape: () => void
}

function OrgNodeCard({ stk, isUnmapped, draggedId, dropTargetId, kbDragId, onDragStart, onDragEnd, onDropTarget, onDropLeave, onDrop, onUnlinkFromTree, onTouchDrop, onTouchUnlink, onDeletePerson, onCardClick, onKbSpace, onKbEscape }: NodeCardProps) {
  const isDragging = draggedId === stk.stakeholder_id
  const isDropTarget = !isUnmapped && dropTargetId === stk.stakeholder_id
  const isKbDragging = kbDragId === stk.stakeholder_id
  const isKbDroppable = kbDragId !== null && kbDragId !== stk.stakeholder_id && !isUnmapped

  const cardRef = useRef<HTMLDivElement>(null)
  const onDragStartRef = useRef(onDragStart)
  const onDragEndRef = useRef(onDragEnd)
  const onTouchDropRef = useRef(onTouchDrop)
  const onTouchUnlinkRef = useRef(onTouchUnlink)
  const isUnmappedRef = useRef(isUnmapped)
  onDragStartRef.current = onDragStart
  onDragEndRef.current = onDragEnd
  onTouchDropRef.current = onTouchDrop
  onTouchUnlinkRef.current = onTouchUnlink
  isUnmappedRef.current = isUnmapped

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const stkId = stk.stakeholder_id

    const handleTouchStart = (e: TouchEvent) => {
      _touchDragStkId = stkId
      const rect = card.getBoundingClientRect()
      const touch = e.touches[0]
      const ghost = card.cloneNode(true) as HTMLElement
      ghost.style.cssText = 'position:fixed;pointer-events:none;opacity:0.75;z-index:9999;width:' + rect.width + 'px;left:' + (touch.clientX - rect.width / 2) + 'px;top:' + (touch.clientY - rect.height / 2) + 'px;transform:scale(0.9)'
      document.body.appendChild(ghost)
      _touchGhost = ghost
      card.classList.add('dragging')
      onDragStartRef.current(stkId)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!_touchDragStkId || !_touchGhost) return
      e.preventDefault()
      const touch = e.touches[0]
      _touchGhost.style.left = (touch.clientX - _touchGhost.offsetWidth / 2) + 'px'
      _touchGhost.style.top = (touch.clientY - _touchGhost.offsetHeight / 2) + 'px'
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'))
      document.querySelectorAll<HTMLElement>('[data-zone2]').forEach(z => { z.style.borderColor = '' })
      if (!el) return
      const targetCard = el.closest('.org-node-card')
      if (targetCard && !isUnmappedRef.current && targetCard !== card) {
        targetCard.classList.add('drop-target')
      } else {
        const zone2 = el.closest<HTMLElement>('[data-zone2]')
        if (zone2) zone2.style.borderColor = 'var(--color-brand-pink)'
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      card.classList.remove('dragging')
      document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'))
      document.querySelectorAll<HTMLElement>('[data-zone2]').forEach(z => { z.style.borderColor = '' })
      const ghost = _touchGhost; _touchGhost = null
      if (ghost) ghost.remove()
      const dragId = _touchDragStkId; _touchDragStkId = null
      onDragEndRef.current()
      if (!dragId) return
      const touch = e.changedTouches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      if (!el) return
      const targetCard = el.closest<HTMLElement>('.org-node-card')
      const zone2 = el.closest('[data-zone2]')
      if (zone2) {
        void onTouchUnlinkRef.current(dragId)
      } else if (targetCard && !isUnmappedRef.current) {
        const targetStkId = targetCard.dataset.stkid
        if (targetStkId && targetStkId !== dragId) {
          void onTouchDropRef.current(dragId, targetStkId)
        }
      }
    }

    card.addEventListener('touchstart', handleTouchStart, { passive: true })
    card.addEventListener('touchmove', handleTouchMove, { passive: false })
    card.addEventListener('touchend', handleTouchEnd)

    return () => {
      card.removeEventListener('touchstart', handleTouchStart)
      card.removeEventListener('touchmove', handleTouchMove)
      card.removeEventListener('touchend', handleTouchEnd)
    }
  }, [stk.stakeholder_id])

  const titleParts = [stk.title, stk.department].filter(Boolean).join(', ')

  return (
    <div
      ref={cardRef}
      className={[
        'org-node-card',
        isDragging ? 'dragging' : '',
        isDropTarget ? 'drop-target' : '',
        isKbDragging ? 'kb-dragging' : '',
        isKbDroppable ? 'kb-droppable' : '',
      ].filter(Boolean).join(' ')}
      draggable
      data-stkid={stk.stakeholder_id}
      role="button"
      tabIndex={0}
      onDragStart={e => { e.dataTransfer.setData('text/plain', stk.stakeholder_id); e.dataTransfer.effectAllowed = 'move'; onDragStart(stk.stakeholder_id) }}
      onDragEnd={onDragEnd}
      onDragOver={!isUnmapped ? e => { e.preventDefault(); onDropTarget(stk.stakeholder_id) } : undefined}
      onDragLeave={!isUnmapped ? onDropLeave : undefined}
      onDrop={!isUnmapped ? async e => { e.preventDefault(); await onDrop(stk.stakeholder_id) } : undefined}
      onClick={e => { if ((e.target as Element).closest('button,select,input,.picker-wrap')) return; onCardClick(stk) }}
      onKeyDown={async e => {
        if (e.key === 'Escape') { onKbEscape(); return }
        if (e.key === ' ') { e.preventDefault(); await onKbSpace(stk.stakeholder_id, isUnmapped); return }
        if (e.key === 'Enter') { if ((e.target as Element).closest('button,select,input,.picker-wrap')) return; onCardClick(stk) }
      }}
    >
      {isUnmapped ? (
        <button
          className="org-unlink-btn"
          title="Remove from people list"
          aria-label="Remove from people list"
          onClick={e => {
            e.stopPropagation()
            onDeletePerson(stk)
          }}
        >×</button>
      ) : stk.reports_to ? (
        <button
          className="org-unlink-btn"
          title="Remove from reporting structure"
          aria-label="Remove from reporting structure"
          onClick={e => { e.stopPropagation(); onUnlinkFromTree(stk.stakeholder_id) }}
        >×</button>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px 12px', minWidth: 0 }}>
        <div className="avatar" style={{ width: 28, height: 28, fontSize: 'var(--font-size-xs)', flexShrink: 0, background: 'var(--purple)', color: 'var(--white)' }}>
          {initials(stk.name)}
        </div>
        <div className="org-node-name">{stk.name || ''}</div>
      </div>
      {titleParts && <div className="org-node-meta">{titleParts}</div>}
    </div>
  )
}

interface DetailPanelProps {
  stk: Stakeholder
  owners: string[]
  otherPeople: Stakeholder[]
  acctProjs: AppState['projects']
  acctOpps: AppState['opportunities']
  onSave: (s: Stakeholder) => Promise<void>
  onClose: () => void
}

function PersonDetailPanel({ stk, owners, otherPeople, acctProjs, acctOpps, onSave, onClose }: DetailPanelProps) {
  const nameRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const deptRef = useRef<HTMLSpanElement>(null)
  const notesRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [rtoError, setRtoError] = useState(false)
  useEffect(() => {
    if (!rtoError) return
    const t = setTimeout(() => setRtoError(false), 3000)
    return () => clearTimeout(t)
  }, [rtoError])

  const curEngIds = (stk.engagement_id || '').split(',').map(s => s.trim()).filter(Boolean)
  const engItems = buildEngItems(acctProjs, acctOpps)

  useEffect(() => {
    const closeBtnEl = panelRef.current?.querySelector<HTMLElement>('.person-detail-close')
    closeBtnEl?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          !(e.target as Element).closest('.app-popover,.app-modal-overlay')) onClose()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => document.addEventListener('mousedown', onOutside), 0)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onOutside); clearTimeout(t) }
  }, [onClose])

  return (
    <div ref={panelRef} id="org-person-panel" className="person-detail-panel" role="dialog" aria-label={stk.name || 'Person'}>
      <div className="person-detail-header">
        <span className="person-detail-title">{stk.name || 'Person'}</span>
        <button className="person-detail-close" type="button" aria-label="Close panel" onClick={onClose}>×</button>
      </div>
      <div className="person-detail-content">
        <div className="person-card">
          <div className="person-card-top">
            <div className={'avatar ' + ((stk.organization || '').toLowerCase() !== 'v.two' ? 'client' : 'vtwo')}>
              {initials(stk.name)}
            </div>
            <div className="person-card-info">
              <div
                ref={nameRef}
                className="name"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Name"
                onBlur={() => {
                  const v = nameRef.current?.textContent?.trim() || ''
                  if (!v) { if (nameRef.current) nameRef.current.textContent = stk.name; return }
                  if (v !== stk.name) onSave({ ...stk, name: v, last_updated: today() })
                }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); nameRef.current?.blur() } }}
              >{stk.name}</div>
              <div className="card-meta-row">
                <span className="card-meta-label">Title:</span>
                <span
                  ref={titleRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Title"
                  style={!stk.title ? { fontStyle: 'italic', color: 'var(--gray)' } : undefined}
                  onFocus={() => { if (!stk.title && titleRef.current?.textContent?.includes('Add title')) { titleRef.current.textContent = ''; titleRef.current.style.cssText = '' } }}
                  onBlur={() => {
                    const v = titleRef.current?.textContent?.trim() || ''
                    if (!v) { if (titleRef.current) { titleRef.current.textContent = 'Add title\u2026'; titleRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } onSave({ ...stk, title: '', last_updated: today() }) }
                    else { if (titleRef.current) titleRef.current.style.cssText = ''; if (v !== stk.title) onSave({ ...stk, title: v, last_updated: today() }) }
                  }}
                >{stk.title || 'Add title\u2026'}</span>
              </div>
              <div className="card-meta-row">
                <span className="card-meta-label">Dept:</span>
                <span
                  ref={deptRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Department"
                  style={!stk.department ? { fontStyle: 'italic', color: 'var(--gray)' } : undefined}
                  onFocus={() => { if (!stk.department && deptRef.current?.textContent?.includes('Add department')) { deptRef.current.textContent = ''; deptRef.current.style.cssText = '' } }}
                  onBlur={() => {
                    const v = deptRef.current?.textContent?.trim() || ''
                    if (!v) { if (deptRef.current) { deptRef.current.textContent = 'Add department\u2026'; deptRef.current.style.cssText = 'font-style:italic;color:var(--gray)' } onSave({ ...stk, department: '', last_updated: today() }) }
                    else { if (deptRef.current) deptRef.current.style.cssText = ''; if (v !== stk.department) onSave({ ...stk, department: v, last_updated: today() }) }
                  }}
                >{stk.department || 'Add department\u2026'}</span>
              </div>
            </div>
          </div>

          <div className="person-card-body expanded">
            <div className="person-owners-block">
              {(['primary_owner', 'secondary_owner'] as const).map(key => (
                <div key={key} className="card-meta-row">
                  <span className="card-meta-label">{key === 'primary_owner' ? 'Primary:' : 'Secondary:'}</span>
                  <Picker
                    value={stk[key]}
                    options={owners}
                    placeholder="Select person…"
                    triggerClass={'card-owner-btn' + (!stk[key] ? ' picker-placeholder' : '')}
                    onChange={v => onSave({ ...stk, [key]: v, last_updated: today() })}
                  />
                </div>
              ))}
            </div>
            <div className="card-meta-row" style={{ marginTop: 14 }}>
              <span className="card-meta-label">Reports To:</span>
              <Picker
                value={otherPeople.find(p => p.stakeholder_id === stk.reports_to)?.name || ''}
                options={otherPeople.map(p => p.name)}
                placeholder="Select person…"
                triggerClass={'card-owner-btn' + (!stk.reports_to ? ' picker-placeholder' : '')}
                onChange={v => {
                  const match = otherPeople.find(p => p.name === v)
                  if (match && isDescendantOf(match.stakeholder_id, stk.stakeholder_id, [stk, ...otherPeople])) {
                    setRtoError(true)
                    return
                  }
                  onSave({ ...stk, reports_to: match ? match.stakeholder_id : '', last_updated: today() })
                }}
              />
            </div>
            {rtoError && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-red)', marginTop: 4, paddingLeft: 8 }}>
                Cannot create circular reporting relationship
              </div>
            )}
            <div className="card-meta-row" style={{ marginTop: 14 }}>
              <OrgEngPicker
                ids={curEngIds}
                items={engItems}
                label={engDisplay(curEngIds, acctProjs, acctOpps)}
                onChange={ids => onSave({ ...stk, engagement_id: ids.join(','), last_updated: today() })}
              />
            </div>
            <div className="card-section-label">Notes</div>
            <div
              ref={notesRef}
              className="card-body-text"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Notes"
              onBlur={() => {
                const v = notesRef.current?.textContent?.trim() || ''
                if (v !== stk.notes) onSave({ ...stk, notes: v, last_updated: today() })
              }}
            >{stk.notes}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrgEngPicker({ ids, items, label, onChange }: {
  ids: string[]
  items: Array<{ value: string; label: string; isHeader?: boolean }>
  label: string
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (val: string) => {
    if (!val || val.startsWith('__h_')) return
    onChange(ids.includes(val) ? ids.filter(x => x !== val) : [...ids, val])
  }

  const handleOpen = () => { setOpen(o => !o); setQuery(''); setTimeout(() => searchRef.current?.focus(), 0) }

  const visibleItems = query
    ? items.filter(item => item.isHeader || item.value === '' || item.label.toLowerCase().includes(query.toLowerCase()))
    : items

  return (
    <div ref={ref} className="picker-wrap">
      <button className="person-eng-pill" onClick={handleOpen} aria-haspopup="listbox">
        {label}
      </button>
      {open && (
        <div className="app-popover" style={{ minWidth: 200 }}>
          <input
            ref={searchRef}
            className="app-popover-search"
            placeholder="Search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          />
          <div className="app-popover-list">
            {visibleItems.map((item, i) =>
              item.isHeader ? (
                <div key={i} className="app-popover-section-label">{item.label}</div>
              ) : (
                <div
                  key={item.value}
                  className={'app-popover-item' + (item.value === '' ? (ids.length === 0 ? ' selected' : '') : (ids.includes(item.value) ? ' selected' : ''))}
                  onMouseDown={e => {
                    e.preventDefault()
                    if (item.value === '') { onChange([]); setOpen(false); setQuery('') }
                    else toggle(item.value)
                  }}
                >{item.label}</div>
              )
            )}
            {visibleItems.filter(i => !i.isHeader).length === 0 && (
              <div className="app-popover-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

