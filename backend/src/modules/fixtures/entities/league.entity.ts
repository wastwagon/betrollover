import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  apiId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string | null = null;

  @Column({ type: 'int', nullable: true })
  season: number | null = null;

  @Column({ type: 'timestamp', nullable: true })
  syncedAt: Date | null = null;
}
