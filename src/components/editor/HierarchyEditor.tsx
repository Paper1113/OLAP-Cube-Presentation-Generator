import type { Dimension, DimensionLevel, DimensionMember } from "../../models/dimension";
import { createId } from "../../utils/id";

interface HierarchyEditorProps {
  dimension: Dimension;
  onChange: (dimension: Dimension) => void;
}

const sortedLevels = (dimension: Dimension): DimensionLevel[] =>
  [...dimension.levels].sort((left, right) => left.order - right.order);

export const HierarchyEditor = ({ dimension, onChange }: HierarchyEditorProps) => {
  const updateLevel = (levelId: string, update: (level: DimensionLevel) => DimensionLevel) => {
    onChange({
      ...dimension,
      levels: dimension.levels.map((level) => level.id === levelId ? update(level) : level),
    });
  };

  const updateMember = (levelId: string, memberId: string, update: (member: DimensionMember) => DimensionMember) => {
    updateLevel(levelId, (level) => ({
      ...level,
      members: level.members.map((member) => member.id === memberId ? update(member) : member),
    }));
  };

  const addLevel = () => {
    const nextOrder = Math.max(0, ...dimension.levels.map((level) => level.order)) + 1;
    onChange({
      ...dimension,
      levels: [...dimension.levels, {
        id: createId(`${dimension.id}-level`),
        name: `Level ${nextOrder}`,
        order: nextOrder,
        members: [],
      }],
    });
  };

  const removeLevel = (levelId: string) => {
    if (dimension.levels.length <= 1) return;
    const removed = dimension.levels.find((level) => level.id === levelId);
    if (!removed) return;
    const removedById = new Map(removed.members.map((member) => [member.id, member]));
    const remaining = dimension.levels
      .filter((level) => level.id !== levelId)
      .sort((left, right) => left.order - right.order)
      .map((level, index) => ({
        ...level,
        order: index + 1,
        members: level.members.map((member) => ({
          ...member,
          parentMemberId: member.parentMemberId && removedById.has(member.parentMemberId)
            ? removedById.get(member.parentMemberId)?.parentMemberId
            : member.parentMemberId,
        })),
      }));
    onChange({ ...dimension, levels: remaining });
  };

  const addMember = (level: DimensionLevel) => {
    const precedingMembers = sortedLevels(dimension)
      .filter((candidate) => candidate.order < level.order)
      .flatMap((candidate) => candidate.members);
    const parentMemberId = precedingMembers.at(-1)?.id;
    updateLevel(level.id, (currentLevel) => ({
      ...currentLevel,
      members: [...currentLevel.members, {
        id: createId(`${dimension.id}-member`),
        label: "New member",
        levelId: currentLevel.id,
        ...(parentMemberId ? { parentMemberId } : {}),
      }],
    }));
  };

  const removeMember = (levelId: string, memberId: string) => {
    onChange({
      ...dimension,
      levels: dimension.levels.map((level) => ({
        ...level,
        members: level.members
          .filter((member) => !(level.id === levelId && member.id === memberId))
          .map((member) => member.parentMemberId === memberId
            ? { ...member, parentMemberId: undefined }
            : member),
      })),
    });
  };

  return (
    <div className="hierarchy-editor">
      {sortedLevels(dimension).map((level) => {
        const parentOptions = sortedLevels(dimension)
          .filter((candidate) => candidate.order < level.order)
          .flatMap((candidate) => candidate.members);
        return (
          <div className="level-editor" key={level.id}>
            <div className="level-editor__header">
              <label>
                Level name
                <input value={level.name} onChange={(event) => updateLevel(level.id, (current) => ({ ...current, name: event.target.value }))} />
              </label>
              <button type="button" className="text-button danger-button" onClick={() => removeLevel(level.id)} disabled={dimension.levels.length <= 1}>Remove level</button>
            </div>
            <div className="member-list">
              {level.members.map((member) => (
                <div className="member-editor" key={member.id}>
                  <label>
                    Member
                    <input value={member.label} onChange={(event) => updateMember(level.id, member.id, (current) => ({ ...current, label: event.target.value }))} />
                  </label>
                  {parentOptions.length > 0 && (
                    <label>
                      Parent
                      <select
                        value={member.parentMemberId ?? ""}
                        onChange={(event) => updateMember(level.id, member.id, (current) => ({
                          ...current,
                          parentMemberId: event.target.value || undefined,
                        }))}
                      >
                        <option value="">No parent</option>
                        {parentOptions.map((parent) => <option key={parent.id} value={parent.id}>{parent.label}</option>)}
                      </select>
                    </label>
                  )}
                  <button type="button" className="icon-button danger-button" aria-label={`Remove ${member.label}`} onClick={() => removeMember(level.id, member.id)}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className="text-button" onClick={() => addMember(level)}>+ Add member</button>
          </div>
        );
      })}
      <button type="button" className="secondary-button" onClick={addLevel}>+ Add hierarchy level</button>
    </div>
  );
};
