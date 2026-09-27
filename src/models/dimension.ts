export interface DimensionMember {
  id: string;
  label: string;
  levelId: string;
  parentMemberId?: string;
}

export interface DimensionLevel {
  id: string;
  name: string;
  order: number;
  members: DimensionMember[];
}

export interface Dimension {
  id: string;
  name: string;
  levels: DimensionLevel[];
}
