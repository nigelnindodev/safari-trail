import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OAuthProvider } from '../auth.types';
import { User } from 'src/users/entity/user.entity';

/**
 * Now (maybe eventually still) the token table does not support multiple sessions across devices
 * From a security standpoint, makes it more strict
 * We could also easily add a session identifier in this table (i.e  user-agent + ip, get device-id/generate uuid from the frontend) so that we can differentiate sessions across devices
 */
@Index(['externalId', 'provider'])
@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', type: 'uuid' })
  externalId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'external_id', referencedColumnName: 'externalId' })
  user: User;

  @Column({ type: 'enum', enum: OAuthProvider })
  provider: OAuthProvider;

  @Column({ name: 'encrypted_token' })
  encryptedToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
