import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sync_status')
export class SyncStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  syncType: string; // 'fixtures', 'odds', 'live', 'finished', 'archive'

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null = null;

  @Column({ type: 'varchar', length: 20, default: 'idle' })
  status: string = 'idle'; // 'idle', 'running', 'success', 'error'

  @Column({ type: 'text', nullable: true })
  lastError: string | null = null;

  @Column({ type: 'int', default: 0 })
  lastSyncCount: number = 0;

  @Column({ type: 'int', nullable: true, name: 'last_sync_leagues' })
  lastSyncLeagues: number | null = null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
