import { BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";


@Entity()
export class Zone {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 120, unique: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string | null;

    //relacion a si misma, una zona puede contener zonas internas
    //sub zonas que estan dentro de una zona padre
    //las sub zonas identifican a su padre mediante el parent_zone_id, que es una columna que solo ellas tienen
    @ManyToOne(() => Zone, (zone) => zone.children, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'parent_zone_id' })
    parent: Zone | null;

    // Lado INVERSO: una zona padre tiene muchas sub-zonas (children)
    @OneToMany(() => Zone, (zone) => zone.parent)
    children: Zone[];

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

}
