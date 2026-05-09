import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

@Entity('accumulator_booking_code_copies')
@Unique(['accumulatorId', 'userId'])
@Index(['accumulatorId'])
export class AccumulatorBookingCodeCopy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  accumulatorId: number;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
