import type { CubeDataset } from "../../models/cube";
import type { OperationSettings } from "../../models/operation";
import { getLevel, membersAtLevel, orderedLevels } from "../../engine/hierarchy";

export interface SlicePanelProps {
  dataset: CubeDataset;
  activeLevels: Record<string, string>;
  slice: OperationSettings["slice"];
  onChange: (slice: OperationSettings["slice"]) => void;
}

const currentLevelId = (
  dimension: CubeDataset["dimensions"][number],
  activeLevels: Record<string, string>,
): string | undefined => {
  const requestedId = activeLevels[dimension.id];
  if (requestedId && getLevel(dimension, requestedId)) return requestedId;
  return orderedLevels(dimension).at(-1)?.id;
};

/** Configure a Slice using exactly one member from one active hierarchy level. */
export const SlicePanel = ({ dataset, activeLevels, slice, onChange }: SlicePanelProps) => {
  const selectedDimension = dataset.dimensions.find((dimension) => dimension.id === slice.dimensionId)
    ?? dataset.dimensions[0];
  const selectedLevelId = selectedDimension
    ? currentLevelId(selectedDimension, activeLevels)
    : undefined;
  const members = selectedDimension && selectedLevelId
    ? membersAtLevel(selectedDimension, selectedLevelId)
    : [];
  const memberIsAvailable = members.some((member) => member.id === slice.memberId);

  const chooseDimension = (dimensionId: string) => {
    const dimension = dataset.dimensions.find((candidate) => candidate.id === dimensionId);
    const levelId = dimension ? currentLevelId(dimension, activeLevels) : undefined;
    const firstMember = dimension && levelId ? membersAtLevel(dimension, levelId)[0] : undefined;
    onChange({ dimensionId, memberId: firstMember?.id ?? "" });
  };

  return (
    <section className="operation-panel slice-panel" aria-labelledby="slice-panel-heading">
      <div className="operation-panel__intro">
        <h3 id="slice-panel-heading">Slice selection</h3>
        <p>Select one member. The resulting diagram retains the other two dimensions.</p>
      </div>
      {dataset.dimensions.length === 0 ? (
        <p className="inline-errors" role="status">Add a dimension before configuring a Slice.</p>
      ) : (
        <div className="operation-form">
          <label className="operation-field">
            Dimension
            <select
              value={selectedDimension?.id ?? ""}
              onChange={(event) => chooseDimension(event.target.value)}
            >
              {dataset.dimensions.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>{dimension.name}</option>
              ))}
            </select>
          </label>
          <label className="operation-field">
            Member
            <select
              value={memberIsAvailable ? slice.memberId : ""}
              onChange={(event) => onChange({
                dimensionId: selectedDimension?.id ?? "",
                memberId: event.target.value,
              })}
              disabled={members.length === 0}
            >
              <option value="" disabled>Select a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.label}</option>
              ))}
            </select>
          </label>
          <p className="operation-field__summary" role="status">
            {selectedDimension && selectedLevelId
              ? `Using ${selectedDimension.name} at the ${getLevel(selectedDimension, selectedLevelId)?.name ?? "selected"} level.`
              : "This dimension does not have an active hierarchy level."}
          </p>
          {!memberIsAvailable && members.length > 0 && (
            <p className="inline-errors" role="status">Choose a member from the current hierarchy level.</p>
          )}
          {members.length === 0 && selectedDimension && (
            <p className="inline-errors" role="status">The current level has no members to slice.</p>
          )}
        </div>
      )}
    </section>
  );
};
