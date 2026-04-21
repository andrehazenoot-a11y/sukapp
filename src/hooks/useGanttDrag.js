import { useEffect, useRef } from 'react';
import { parseDate, formatDate, addDays, diffWorkdays, snapToWorkday, snapToWorkdayBack } from '../utils/dateUtils';

export function useGanttDrag({
    ganttWrapperRef,
    timelineDatesRef,
    dragRef,
    justDraggedRef,
    dblClickRef,
    getProjectRef, // (projectId) => projectObj (for synchronous read during event)
    updateProjectState, // (projectId, updaterFn) => void (to update state correctly in both Single and Multiple project modes)
    setEditingBarId,
    setEditingBarName,
    selectTaskRef,
    sortTasksByDateRef,
    forceSaveRef,
    isHoliday,
    enabledHolidays
}) {
    // Gebruik refs om stale closures te voorkomen in de lege-afhankelijkheid useEffect
    const isHolidayRef = useRef(isHoliday);
    isHolidayRef.current = isHoliday;
    
    const enabledHolidaysRef = useRef(enabledHolidays);
    enabledHolidaysRef.current = enabledHolidays;

    useEffect(() => {
        const wrapper = ganttWrapperRef.current;
        if (!wrapper) return;

        const tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:fixed;z-index:100001;background:#1e293b;color:#fff;font-size:0.72rem;font-weight:700;padding:5px 10px;border-radius:8px;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.1s;';
        document.body.appendChild(tooltip);

        const computeEnd = (startD, workdays) => {
            let e = new Date(startD); let n = workdays - 1;
            while (n > 0) { 
                e.setDate(e.getDate()+1); 
                if(e.getDay()!==0 && e.getDay()!==6 && !isHolidayRef.current(e)) n--; 
            }
            return e;
        };
        const fmtNL = (str) => { const d = parseDate(str); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; };

        const setStartAbs = (projectId, tId, ns) => updateProjectState(projectId, prev => {
            if (!prev) return prev;
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, startDate: formatDate(ns) }) };
            return { ...prev, startDate: formatDate(ns) };
        });
        const setEndAbs = (projectId, tId, ne) => updateProjectState(projectId, prev => {
            if (!prev) return prev;
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, endDate: formatDate(ne) }) };
            return { ...prev, endDate: formatDate(ne) };
        });
        const setDatesAbs = (projectId, tId, ns, ne) => updateProjectState(projectId, prev => {
            if (!prev) return prev;
            if (tId) return { ...prev, tasks: prev.tasks.map(t => t.id !== tId ? t : { ...t, startDate: formatDate(ns), endDate: formatDate(ne) }) };
            
            const oldProjStart = parseDate(prev.startDate);
            const newProjStart = parseDate(formatDate(ns));
            
            return { ...prev, startDate: formatDate(ns), endDate: formatDate(ne),
                tasks: prev.tasks.map(t => {
                    const startOffsetWdays = diffWorkdays(oldProjStart, parseDate(t.startDate), enabledHolidaysRef.current) - 1;
                    const taskWdays = diffWorkdays(parseDate(t.startDate), parseDate(t.endDate), enabledHolidaysRef.current);
                    
                    const nStart = computeEnd(newProjStart, Math.max(1, startOffsetWdays + 1));
                    const nEnd = computeEnd(nStart, Math.max(1, taskWdays));
                    
                    // Sync assignedByDay for Global Planning component compatibility!
                    let newAssignedByDay = t.assignedByDay;
                    if (t.assignedByDay) {
                        newAssignedByDay = {};
                        Object.keys(t.assignedByDay).forEach(oldDs => {
                            const oldD = parseDate(oldDs);
                            const diffFromTStart = diffWorkdays(parseDate(t.startDate), oldD, enabledHolidaysRef.current) - 1;
                            const newD = computeEnd(nStart, Math.max(1, diffFromTStart + 1));
                            newAssignedByDay[formatDate(newD)] = t.assignedByDay[oldDs];
                        });
                    }
                    
                    return { ...t, startDate: formatDate(nStart), endDate: formatDate(nEnd), assignedByDay: newAssignedByDay };
                }) 
            };
        });

        const handleMouseDown = (e) => {
            if (e.button !== 0) return;
            const bar = e.target.closest('.gantt-bar');
            if (!bar) return;
            
            const rawProjectId = bar.dataset.projectId;
            const projectId = rawProjectId ? (isNaN(Number(rawProjectId)) ? rawProjectId : Number(rawProjectId)) : null;
            if (!projectId && projectId !== 0) return;

            const isResizeHandle = e.target.classList.contains('resize-handle');
            const isLeftResize = e.target.classList.contains('resize-handle-left');
            const rawTaskId = bar.dataset.taskId;
            const taskId = (rawTaskId && rawTaskId !== 'null' && rawTaskId !== '') ? rawTaskId : null;
            const editId = taskId || 'project';

            const origStart = bar.dataset.startDate;
            const origEnd   = bar.dataset.endDate;
            if (!origStart || !origEnd) return; // Silent early return if rendered without proper data-attributes
            
            const origWorkdays = Math.max(diffWorkdays(parseDate(origStart), parseDate(origEnd), enabledHolidaysRef.current), 1);

            if (!isResizeHandle) {
                const now = Date.now();
                if (dblClickRef.current.id === editId && now - dblClickRef.current.t < 350) {
                    dblClickRef.current = { t: 0, id: null };
                    e.stopPropagation(); e.preventDefault();
                    const projObj = getProjectRef(projectId);
                    const name = taskId ? projObj?.tasks.find(t => String(t.id) === String(taskId))?.name : projObj?.name;
                    if (setEditingBarId) setEditingBarId(editId);
                    if (setEditingBarName) setEditingBarName(name || '');
                    return;
                }
                dblClickRef.current = { t: Date.now(), id: editId };
            }

            e.stopPropagation(); e.preventDefault();
            const timelineEl = bar.parentElement;
            if (!timelineEl) return;
            const cellWidth = timelineEl.offsetWidth / timelineDatesRef.current.length;
            justDraggedRef.current = true;
            const savedOverflow = wrapper.style.overflowX;
            wrapper.style.overflowX = 'hidden';
            const blockWheel = (ev) => { ev.preventDefault(); };
            wrapper.addEventListener('wheel', blockWheel, { passive: false });
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;touch-action:none;cursor:' + (isResizeHandle ? 'col-resize' : 'grabbing') + ';';
            document.body.appendChild(overlay);
            document.body.style.userSelect = 'none';

            const state = { startX: e.clientX, cellWidth, rawDaysMoved: 0, lastClientX: e.clientX, scrollAccum: 0, animFrame: null };
            dragRef.current = state;
            tooltip.style.opacity = '1';

            const applyPosition = (rawDays) => {
                if (isResizeHandle) {
                    if (isLeftResize) {
                        const ns = snapToWorkday(addDays(parseDate(origStart), rawDays), enabledHolidaysRef.current);
                        if (ns > parseDate(origEnd)) return;
                        setStartAbs(projectId, taskId, ns);
                        tooltip.textContent = `↔ ${fmtNL(formatDate(ns))} → ${fmtNL(origEnd)}`;
                    } else {
                        const ne = snapToWorkdayBack(addDays(parseDate(origEnd), rawDays), enabledHolidaysRef.current);
                        if (ne < parseDate(origStart)) return;
                        setEndAbs(projectId, taskId, ne);
                        tooltip.textContent = `↔ ${fmtNL(origStart)} → ${fmtNL(formatDate(ne))}`;
                    }
                } else {
                    const ns = snapToWorkday(addDays(parseDate(origStart), rawDays), enabledHolidaysRef.current);
                    const ne = computeEnd(ns, origWorkdays);
                    setDatesAbs(projectId, taskId, ns, ne);
                    tooltip.textContent = `⟷ ${fmtNL(formatDate(ns))} → ${fmtNL(formatDate(ne))}`;
                }
            };

            if (!isResizeHandle) {
                const EDGE_ZONE = 60, SCROLL_SPEED = 8;
                const autoScroll = () => {
                    if (!dragRef.current) return;
                    wrapper.style.overflowX = 'auto';
                    const rect = wrapper.getBoundingClientRect();
                    const x = state.lastClientX;
                    let scrollDelta = 0;
                    if (x > rect.right - EDGE_ZONE) scrollDelta = SCROLL_SPEED;
                    else if (x < rect.left + EDGE_ZONE) scrollDelta = -SCROLL_SPEED;
                    if (scrollDelta !== 0) {
                        wrapper.scrollLeft += scrollDelta;
                        state.scrollAccum += scrollDelta;
                        const scrollDays = Math.round(state.scrollAccum / state.cellWidth);
                        if (scrollDays !== 0) {
                            state.scrollAccum -= scrollDays * state.cellWidth;
                            state.startX -= scrollDays * state.cellWidth;
                            const dx = state.lastClientX - state.startX;
                            const rawDays = Math.round(dx / state.cellWidth);
                            state.rawDaysMoved = rawDays;
                            applyPosition(rawDays);
                        }
                    }
                    wrapper.style.overflowX = 'hidden';
                    state.animFrame = requestAnimationFrame(autoScroll);
                };
                state.animFrame = requestAnimationFrame(autoScroll);
            }

            const onMove = (ev) => {
                state.lastClientX = ev.clientX;
                const dx = ev.clientX - state.startX;
                const rawDays = Math.round(dx / state.cellWidth);
                tooltip.style.left = (ev.clientX + 14) + 'px';
                tooltip.style.top  = (ev.clientY - 36) + 'px';
                if (rawDays !== state.rawDaysMoved) {
                    state.rawDaysMoved = rawDays;
                    applyPosition(rawDays);
                }
            };
            const onUp = () => {
                dragRef.current = null;
                if (state.animFrame) cancelAnimationFrame(state.animFrame);
                overlay.removeEventListener('mousemove', onMove);
                overlay.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove, true);
                document.removeEventListener('mouseup', onUp, true);
                wrapper.removeEventListener('wheel', blockWheel);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                wrapper.style.overflowX = savedOverflow || 'auto';
                document.body.style.userSelect = '';
                tooltip.style.opacity = '0';
                
                if (state.rawDaysMoved === 0 && !isResizeHandle && taskId) {
                    if (selectTaskRef?.current) {
                        const parsedTaskId = isNaN(Number(taskId)) ? taskId : Number(taskId);
                        selectTaskRef.current(parsedTaskId);
                    }
                }
                setTimeout(() => {
                    if (justDraggedRef?.current !== undefined) justDraggedRef.current = false;
                    sortTasksByDateRef?.current?.();
                    forceSaveRef?.current?.();
                }, 200);
            };

            overlay.addEventListener('mousemove', onMove);
            overlay.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove, true);
            document.addEventListener('mouseup', onUp, true);
        };

        wrapper.addEventListener('mousedown', handleMouseDown, true);
        return () => {
            wrapper.removeEventListener('mousedown', handleMouseDown, true);
            if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
