import { Generated, ColumnType } from 'kysely';

export interface Database {
  users: UserTable;
  projects: ProjectTable;
  assets: AssetTable;
}

export interface UserTable {
  id: Generated<string>;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  updatedAt: ColumnType<Date, string | undefined, Date | string>;
}

export interface ProjectTable {
  id: Generated<string>;
  userId: string;
  name: string;
  timelineData: string; // JSON string containing the editor timeline state
  renderStatus: 'idle' | 'rendering' | 'completed' | 'failed';
  renderJobId: string | null;
  createdAt: ColumnType<Date, string | undefined, never>;
  updatedAt: ColumnType<Date, string | undefined, Date | string>;
}

export interface AssetTable {
  id: Generated<string>;
  projectId: string;
  type: 'video' | 'audio' | 'image' | '3d_model' | 'mask';
  url: string;
  metadata: string; // JSON string
  createdAt: ColumnType<Date, string | undefined, never>;
}
