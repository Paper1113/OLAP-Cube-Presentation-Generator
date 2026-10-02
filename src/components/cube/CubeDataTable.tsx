import { useState } from 'react';
import type { CubeViewModel } from '../../models/cube';

/** Hidden faces remain inspectable without mounting thousands of rows on each render. */
export const CubeDataTable = ({view}: {view: CubeViewModel}) => {
  const [open, setOpen] = useState(false);
  const axes = [view.x, view.y, view.z];
  const labels = axes.map(axis => new Map(axis.members.map(member => [member.id, member.label])));
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Full values and coordinates ({view.cells.length} cells)</summary>
    {open && <>
      <p>Display uses rounded numbers; this table retains full values. Values on hidden faces are available here. Use Slice / Dice to inspect them on the cube.</p>
      <div style={{maxHeight:300, overflow:'auto'}}><table><thead><tr>{axes.map(axis => <th key={axis.dimensionId}>{axis.dimensionName}</th>)}<th>{view.measure.name} (full value)</th></tr></thead>
        <tbody>{view.cells.map((cell,i) => <tr key={i}>{[cell.xMemberId,cell.yMemberId,cell.zMemberId].map((id,j) => <td key={j}>{labels[j].get(id)} ({id})</td>)}<td>{cell.hasData ? String(cell.value) : '—'}</td></tr>)}</tbody>
      </table></div>
    </>}
  </details>;
};
