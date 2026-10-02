import type { CubeDataset } from "../../models/cube";
import type { OperationSettings } from "../../models/operation";
import { getLevel, membersAtLevel, orderedLevels } from "../../engine/hierarchy";

export interface DicePanelProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  dice: OperationSettings["dice"];
  onChange: (dice: OperationSettings["dice"]) => void;
}

const currentLevelId = (
  dimension: CubeDataset["dimensions"][number],
  activeLevels: Record<string, string>,
): string | undefined => {
  const requestedId = activeLevels[dimension.id];
  if (requestedId) return getLevel(dimension, requestedId)?.id;
  return orderedLevels(dimension).at(-1)?.id;
};

/** Configure one or more member selections per dimension for a Dice sub-cube. */
export const DicePanel = ({ dataset, activeLevels, dice, onChange }: DicePanelProps) => {
  const updateSelection = (dimensionId: string, memberIds: string[]) => {
    onChange({
      selections: {
        ...dice.selections,
        [dimensionId]: memberIds,
      },
    });
  };

  return (
    <section className="operation-panel dice-panel" aria-labelledby="dice-panel-heading">
      <div className="operation-panel__intro">
        <h3 id="dice-panel-heading">Dice selections</h3>
        <p>Choose one or more members in each dimension to create a smaller sub-cube.</p>
      </div>
      {dataset.dimensions.length === 0 ? (
        <p className="inline-errors" role="status">Add dimensions before configuring a Dice operation.</p>
      ) : (
        <div className="dice-member-pickers">
          {dataset.dimensions.map((dimension) => {
            const levelId = currentLevelId(dimension, activeLevels);
            const level = levelId ? getLevel(dimension, levelId) : undefined;
            const members = levelId ? membersAtLevel(dimension, levelId) : [];
            const availableMemberIds = new Set(members.map((member) => member.id));
            const selectedMemberIds = (dice.selections[dimension.id] ?? [])
              .filter((memberId) => availableMemberIds.has(memberId));
            const selectId = `dice-${dimension.id}`;

            return (
              <fieldset className="operation-member-picker" key={dimension.id}>
                <legend>{dimension.name}</legend>
                <p className="operation-field__summary">
                  {level ? `${level.name} level` : "No active level"}
                </p>
                <select
                  id={selectId}
                  multiple
                  size={Math.min(Math.max(members.length, 2), 6)}
                  value={selectedMemberIds}
                  aria-describedby={`${selectId}-hint`}
                  onChange={(event) => updateSelection(
                    dimension.id,
                    Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                  )}
                  disabled={members.length === 0}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.label}</option>
                  ))}
                </select>
                <p id={`${selectId}-hint`} className="hint">
                  {members.length === 0
                    ? "No members are available at this level."
                    : `${selectedMemberIds.length} of ${members.length} member${members.length === 1 ? "" : "s"} selected.`}
                </p>
                <div className="operation-member-picker__actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => updateSelection(dimension.id, members.map((member) => member.id))}
                    disabled={members.length === 0}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => updateSelection(dimension.id, [])}
                    disabled={selectedMemberIds.length === 0}
                  >
                    Clear
                  </button>
                </div>
                {(dice.selections[dimension.id] ?? []).some(id => !availableMemberIds.has(id)) && <p className="inline-errors" role="status">Selection includes removed or unavailable members. Explicitly select the intended members again.</p>}
                {members.length > 0 && selectedMemberIds.length === 0 && (
                  <p className="inline-errors" role="status">Select at least one {dimension.name} member.</p>
                )}
              </fieldset>
            );
          })}
        </div>
      )}
    </section>
  );
};
