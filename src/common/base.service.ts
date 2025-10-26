// src/common/base.service.ts
import {
  Brackets,
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { IApiResponse } from '../types/response';
import { Log } from '../entities/log';
import { User } from '../entities/user';

/** ---------- Options & helper types ---------- */

export type Logic = 'and' | 'or';

export interface PermissionOptions {
  /** Permission codes to require (by default: any-of). */
  requirePerms?: string[] | string;
  /** Require 'any' or 'all' of the provided perms. Default: 'any'. */
  mode?: 'any' | 'all';
}

export interface FacilityScopeOptions<T> {
  /** Enable facility-level scoping (for facility managers). */
  enabled?: boolean;
  /**
   * Property on T that directly holds facility id (e.g., 'facilityId' on Facility/Tournament).
   * If present, we'll filter `entity.facilityId IN (:...ids)`.
   */
  facilityIdProperty?: keyof T & string;
  /**
   * If the entity owns a Place relation, name of that relation (e.g., 'place', 'eventPlace').
   * We’ll join it and filter its `facilityId`.
   */
  placeRelation?: string;
  /**
   * If there is only a place id field (no relation mapped), provide the property name.
   * We’ll join `places` on entity.<placeIdProperty> = p.id to reach p.facility_id.
   */
  placeIdProperty?: keyof T & string;
}

export interface UserScopeOptions<T> {
  /** Enable user-level scoping (e.g., each user sees only own rows). */
  enabled?: boolean;
  /** Property on T to compare with the current user id (e.g., 'userId' or 'createdBy'). */
  userIdProperty?: keyof T & string;
}

export interface BaseServiceListOptions<TList> {
  repo: Repository<TList>;
  alias?: string;
}

export interface BaseServiceOptions<TEntity, TList = TEntity> {
  /** Default QB alias for this entity. */
  alias?: string;
  /** Override the primary key property (auto-detected if single PK). */
  primaryKeyProperty?: keyof TEntity & string;
  /** Columns that can be searched via `?q=`. */
  searchableColumns?: string[];
  /** Default sort string, e.g. '-createdAt,+name'. */
  defaultSort?: string;
  /** Admin role names to bypass scoping. */
  adminRoleNames?: string[];
  /** Soft-delete property on T (default: 'deletedAt' if present). */
  softDeleteProperty?: keyof TEntity & string;

  /** Access control scopes */
  facilityScope?: FacilityScopeOptions<TEntity>;
  userScope?: UserScopeOptions<TEntity>;

  /** Optional view/list repository for list responses. */
  list?: BaseServiceListOptions<TList>;
}

export interface BaseControllerOptions {
  permissions?: {
    list?: string[];     // GET /
    read?: string[];     // GET /:id
    create?: string[];   // POST /
    update?: string[];   // PUT /:id
    delete?: string[];   // DELETE /:id
  };
}

/** ---------- Base Service ---------- */

export abstract class BaseService<TEntity extends ObjectLiteral, TList extends ObjectLiteral = TEntity> {
  protected readonly alias: string;
  protected readonly listAlias: string;
  protected readonly listRepo: Repository<TList>;
  protected readonly usingCustomListRepo: boolean;
  protected readonly opts: Required<Omit<BaseServiceOptions<TEntity, TList>, 'list'>>;

  constructor(
    protected readonly repo: Repository<TEntity>,
    protected readonly dataSource: DataSource,
    options: BaseServiceOptions<TEntity, TList> = {},
  ) {
    this.alias = options.alias ?? 'entity';
    const fallbackListRepo = repo as unknown as Repository<TList>;
    this.listRepo = options.list?.repo ?? fallbackListRepo;
    this.listAlias = options.list?.alias ?? this.alias;
    this.usingCustomListRepo = Boolean(options.list?.repo && options.list.repo !== fallbackListRepo);

    // pick defaults and detect features from metadata
    const pk = options.primaryKeyProperty ?? this.detectSinglePrimaryKey();
    const softDelete = options.softDeleteProperty ?? (this.hasEntityProperty('deletedAt') ? ('deletedAt' as keyof TEntity & string) : (null as any));
    this.opts = {
      alias: this.alias,
      primaryKeyProperty: pk,
      searchableColumns: options.searchableColumns ?? [],
      defaultSort: options.defaultSort ?? '-createdAt',
      adminRoleNames: options.adminRoleNames ?? ['admin', 'super_admin', 'owner'],
      softDeleteProperty: softDelete,
      facilityScope: options.facilityScope ?? {},
      userScope: options.userScope ?? {},
    };
  }

  /** ----------- public API ----------- */

  getPrimaryKeyField(): string {
    return this.opts.primaryKeyProperty as string;
  }

  async findAll(
    query: any,
    user?: any,
    perm?: PermissionOptions,
  ): Promise<{ data: TList[]; count: number }> {
    try {
      await this.assertHasPermissions(user, perm?.requirePerms, perm?.mode);

      let qb = this.createListQueryBuilder();
      qb = await this.applyAccessControl(qb, user);
      qb = this.applySoftDeleteFilter(qb);
      qb = this.applyFilters(qb, query);
      qb = this.applySearch(qb, query?.q);
      qb = this.applySorting(qb, query?.sort ?? this.opts.defaultSort);

      const limit = Math.min(Math.max(parseInt(query?.limit ?? '10', 10), 1), 200);
      const offset = Math.max(parseInt(query?.offset ?? '0', 10), 0);

    if (this.usingCustomListRepo) {
      const pagedQb = qb.clone()
        .offset(offset)
        .limit(limit);

      const ids = await qb.clone()
        .select(`${this.listAlias}.${String(this.opts.primaryKeyProperty)}`, 'id')
        .distinct(true)
        .getRawMany<{ id: number }>();

      const rows = await pagedQb.getMany();
      return { data: rows as TList[], count: ids.length };
    }

    const pagedQb = qb.clone().skip(offset).take(limit);
    const [rows, count] = await pagedQb.getManyAndCount();
      const mapped = await this.mapListResult(rows as unknown as TEntity[], query, user);
      return { data: mapped, count };
    } catch (ex) {
      console.log(ex);
    }
    return { data: [], count: 0 };
  }

  protected createListQueryBuilder(): SelectQueryBuilder<any> {
    const qb = this.listRepo.createQueryBuilder(this.listAlias);
    if (this.usingCustomListRepo) {
      qb.select(this.listAlias);
      qb.innerJoin(
        this.repo.metadata.target as any,
        this.alias,
        `${this.alias}.${String(this.opts.primaryKeyProperty)} = ${this.listAlias}.${String(this.opts.primaryKeyProperty)}`,
      );
    }
    return qb;
  }

  async findOne(
    id: number | string,
    user?: any,
    perm?: PermissionOptions,
  ): Promise<TEntity | null> {
    await this.assertHasPermissions(user, perm?.requirePerms, perm?.mode);

    // Load with relations to make controllers useful by default
    const relations = this.repo.metadata.relations.map((r) => r.propertyName);
    let qb = this.repo.createQueryBuilder(this.alias);
    relations.forEach((rel) => qb.leftJoinAndSelect(`${this.alias}.${rel}`, rel));

    qb = await this.applyAccessControl(qb, user);
    qb = this.applySoftDeleteFilter(qb);

    qb = qb.andWhere(`${this.alias}.${String(this.opts.primaryKeyProperty)} = :id`, { id });
    return qb.getOne();
  }

  async create(
    dto: Partial<TEntity>,
    user?: any,
    perm?: PermissionOptions,
  ): Promise<IApiResponse<TEntity>> {
    await this.assertHasPermissions(user, perm?.requirePerms, perm?.mode);

    // best-effort: set createdBy if the property exists
    if (this.hasEntityProperty('createdBy') && user) {
      (dto as any).createdBy = this.getUserId(user);
    }
    // drop soft-delete/PK inputs if present
    delete (dto as any)[String(this.opts.softDeleteProperty)];
    delete (dto as any)[String(this.opts.primaryKeyProperty)];

    const saved = await this.repo.save(dto as TEntity);
    await this.addLog({ typeId: 1, text1: `${this.repo.metadata.tableName} created`, user }); // typeId=1 as example

    return { data: saved };
  }

  async update(
    id: number | string,
    dto: Partial<TEntity>,
    user?: any,
    perm?: PermissionOptions,
  ): Promise<IApiResponse<TEntity>> {
    await this.assertHasPermissions(user, perm?.requirePerms, perm?.mode);

    const existing = await this.findOne(id, user);
    if (!existing) {
      return { data: undefined as any, error: 'Record not found' };
    }

    // Do not allow overriding these system columns
    delete (dto as any)[String(this.opts.softDeleteProperty)];
    delete (dto as any)[String(this.opts.primaryKeyProperty)];
    delete (dto as any)['createdAt'];
    delete (dto as any)['createdBy'];

    await this.repo.update({ [String(this.opts.primaryKeyProperty)]: id } as any, dto);
    const updated = await this.findOne(id, user);

    await this.addLog({
      typeId: 4,
      text1: `${this.repo.metadata.tableName} updated`,
      text2: String(id),
      text3: JSON.stringify(dto),
      user,
    });

    return { data: updated as TEntity };
  }

  async delete(
    id: number | string,
    user?: any,
    perm?: PermissionOptions,
  ): Promise<IApiResponse<boolean>> {
    await this.assertHasPermissions(user, perm?.requirePerms, perm?.mode);

    const existing = await this.findOne(id, user);
    if (!existing) return { data: false, error: 'Record not found' };

    if (this.opts.softDeleteProperty) {
      await this.repo.update(
        { [String(this.opts.primaryKeyProperty)]: id } as any,
        { [String(this.opts.softDeleteProperty)]: new Date() } as any,
      );
    } else {
      await this.repo.delete({ [String(this.opts.primaryKeyProperty)]: id } as any);
    }

    await this.addLog({
      typeId: 5,
      text1: `${this.repo.metadata.tableName} deleted`,
      text2: String(id),
      user,
    });

    return { data: true };
  }

  /** ----------- logging ----------- */

  protected async addLog(args: {
    typeId?: number;
    user?: any;
    text1?: string;
    text2?: string;
    text3?: string;
    text4?: string;
  }) {
    const logRepo = this.dataSource.getRepository(Log);
    const log = logRepo.create({
      typeId: args.typeId,
      text1: args.text1,
      text2: args.text2,
      text3: args.text3,
      text4: args.text4,
      createdBy: this.getUserId(args.user) ?? null,
    });
    try {
      await logRepo.save(log);
    } catch {
      // logging must never block core operations
    }
  }

  /** ----------- permissions & scoping ----------- */

  protected async assertHasPermissions(
    user: any,
    required?: string[] | string,
    mode: 'any' | 'all' = 'any',
  ): Promise<void> {
    if (!required || (Array.isArray(required) && required.length === 0)) return;

    const perms = Array.isArray(required) ? required : [required];
    if (perms.length === 0) return;

    // Admins bypass fine-grained permission checks
    if (await this.isAdmin(user)) return;

    const ok = await this.userHasPermissions(user, perms, mode);
    if (!ok) {
      throw new Error('Forbidden: insufficient permissions');
    }
  }

  protected async isAdmin(user: any): Promise<boolean> {
    const id = this.getUserId(user);
    if (!id) return false;

    const roleRows = await this.dataSource
      .createQueryBuilder()
      .select('r.name', 'name')
      .from('users', 'u')
      .innerJoin('roles', 'r', 'r.id = u.role_id')
      .where('u.id = :id', { id })
      .getRawMany<{ name: string }>();

    const roleNames = (roleRows ?? []).map((r) => (r.name || '').toLowerCase());
    return this.opts.adminRoleNames.some((adm) => roleNames.includes(adm.toLowerCase()));
  }

  protected async userHasPermissions(user: any, perms: string[], mode: 'any' | 'all'): Promise<boolean> {
    const id = this.getUserId(user);
    if (!id) return false;

    const rows = await this.dataSource
      .createQueryBuilder()
      .select('p.name', 'name')
      .from('users', 'u')
      .innerJoin('role_permissions', 'rp', 'rp.role_id = u.role_id')
      .innerJoin('permissions', 'p', 'p.id = rp.permission_id')
      .where('u.id = :id', { id })
      .andWhere('p.name IN (:...perms)', { perms })
      .getRawMany<{ name: string }>();

    if (mode === 'all') {
      const set = new Set(rows.map((r) => r.name));
      return perms.every((p) => set.has(p));
    }
    return rows.length > 0;
  }

  protected async applyAccessControl<E = TEntity>(
    qb: SelectQueryBuilder<E>,
    user?: any,
  ): Promise<SelectQueryBuilder<E>> {
    // Admin: see all
    if (await this.isAdmin(user)) return qb;

    const { facilityScope, userScope } = this.opts;

    // If caller belongs to facility staff, we restrict by facility
    if (facilityScope?.enabled) {
      const facilityIds = await this.getUserFacilityIds(user);
      // If user has no facility membership, return nothing
      if (!facilityIds.length) {
        return qb.andWhere('1=0');
      }

      // 1) Direct facilityId column
      if (facilityScope.facilityIdProperty && this.hasEntityProperty(facilityScope.facilityIdProperty)) {
        qb = qb.andWhere(
          `${this.alias}.${facilityScope.facilityIdProperty} IN (:...facilityIds)`,
          { facilityIds },
        );
      }
      // 2) Join via relation to Place (e.g., 'place', 'eventPlace')
      else if (facilityScope.placeRelation) {
        const palias = 'place_fac_scope';
        qb = qb.leftJoin(`${this.alias}.${facilityScope.placeRelation}`, palias);
        qb = qb.andWhere(`${palias}.facilityId IN (:...facilityIds)`, { facilityIds });
      }
      // 3) Join via placeId property
      else if (facilityScope.placeIdProperty && this.hasEntityProperty(facilityScope.placeIdProperty)) {
        const palias = 'place_fac_scope';
        qb = qb.leftJoin('places', palias, `${palias}.id = ${this.alias}.${facilityScope.placeIdProperty}`);
        qb = qb.andWhere(`${palias}.facility_id IN (:...facilityIds)`, { facilityIds });
      }
    }

    // User-level scope (if enabled and user is not facility staff)
    if (userScope?.enabled && user) {
      const myId = this.getUserId(user);
      if (myId && userScope.userIdProperty && this.hasEntityProperty(userScope.userIdProperty)) {
        qb = qb.andWhere(`${this.alias}.${userScope.userIdProperty} = :me`, { me: myId });
      }
    }

    return qb;
  }

  protected async getUserFacilityIds(user?: any): Promise<number[]> {
    const uid = this.getUserId(user);
    if (!uid) return [];
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('fs.facility_id', 'facility_id')
      .from('facility_staff', 'fs')
      .where('fs.user_id = :uid', { uid })
      .getRawMany<{ facility_id: string }>();
    return rows.map((r) => Number(r.facility_id));
  }

  /** ----------- filtering / sorting / search ----------- */

  protected applySoftDeleteFilter<E = TEntity>(qb: SelectQueryBuilder<E>): SelectQueryBuilder<E> {
    if (this.opts.softDeleteProperty) {
      qb = qb.andWhere(`${this.alias}.${String(this.opts.softDeleteProperty)} IS NULL`);
    }
    return qb;
  }

  /**
   * Filter DSL (safe):
   * - field:eq,lt,lte,gt,gte
   * - field:inc (contains), sw (startsWith), ew (endsWith)
   * - field:in  (comma-separated or array)
   * - field:ie  (is null), ine (is not null)
   * Example: ?firstName:sw=Mo&createdAt:gte=2024-01-01
   */
  protected applyFilters<E = TEntity>(qb: SelectQueryBuilder<E>, query: any): SelectQueryBuilder<E> {
    if (!query) return qb;
    const logic: Logic = (query.lo || 'and').toLowerCase() === 'or' ? 'or' : 'and';

    const where = (expr: string, params?: ObjectLiteral) => {
      if (logic === 'and') qb.andWhere(expr, params);
      else qb.orWhere(expr, params);
    };

    for (const rawKey of Object.keys(query)) {
      if (!rawKey.includes(':')) continue;
      const [field, op] = rawKey.split(':');
      const value = query[rawKey];

      const col = this.resolveColumn(field);
      if (!col) continue;

      switch (op) {
        case 'eq':
        case 'lt':
        case 'gt':
        case 'lte':
        case 'gte': {
          const operator = op === 'eq' ? '=' : op.toUpperCase();
          if (Array.isArray(value)) {
            value.forEach((v, i) => where(`${col} ${operator} :${field}_${i}`, { [`${field}_${i}`]: v }));
          } else {
            where(`${col} ${operator} :${field}`, { [field]: value });
          }
          break;
        }
        case 'inc':
        case 'sw':
        case 'ew': {
          const prefix = op === 'ew' ? '' : '%';
          const suffix = op === 'sw' ? '' : '%';
          if (Array.isArray(value)) {
            value.forEach((v, i) => where(`${col} ILIKE :${field}_${i}`, { [`${field}_${i}`]: `${prefix}${v}${suffix}` }));
          } else {
            where(`${col} ILIKE :${field}`, { [field]: `${prefix}${value}${suffix}` });
          }
          break;
        }
        case 'in': {
          const list = Array.isArray(value) ? value : String(value).split(',').map((x) => x.trim()).filter(Boolean);
          if (list.length) where(`${col} IN (:...${field}_in)`, { [`${field}_in`]: list });
          break;
        }
        case 'ie':
          where(`${col} IS NULL`);
          break;
        case 'ine':
          where(`${col} IS NOT NULL`);
          break;
      }
    }
    return qb;
  }

  protected applySearch<E = TEntity>(qb: SelectQueryBuilder<E>, q?: string): SelectQueryBuilder<E> {
    if (!q || !this.opts.searchableColumns.length) return qb;
    qb = qb.andWhere(
      new Brackets((b) => {
        this.opts.searchableColumns.forEach((c, i) => {
          const column = this.resolveColumn(String(c));
          if (!column) return;
          const param = `q_${i}`;
          b.orWhere(`${column} ILIKE :${param}`, { [param]: `%${q}%` });
        });
      }),
    );
    return qb;
  }

  protected applySorting<E = TEntity>(qb: SelectQueryBuilder<E>, sort?: string): SelectQueryBuilder<E> {
    if (!sort) return qb;
    const parts = String(sort).split(',').map((s) => s.trim()).filter(Boolean);
    parts.forEach((p) => {
      const dir = p.startsWith('-') ? 'DESC' : 'ASC';
      const field = p.replace(/^[-+]/, '');
      const column = this.resolveColumn(field);
      if (column) {
        qb.addOrderBy(column, dir as any);
      }
    });
    return qb;
  }

  /** ----------- utilities ----------- */

  protected getUserId(user: any): number | undefined {
    if (!user) return undefined;
    return Number((user.id ?? user.userId) ?? undefined);
  }

  protected detectSinglePrimaryKey(): keyof TEntity & string {
    const pks = this.repo.metadata.primaryColumns.map((c) => c.propertyName);
    if (pks.length !== 1) {
      throw new Error(
        `BaseService requires a single primary key; found [${pks.join(', ')}] on ${this.repo.metadata.name}. ` +
        `Pass 'primaryKeyProperty' in options to override.`,
      );
    }
    return pks[0] as keyof TEntity & string;
  }

  protected resolveColumn(field: string): string | null {
    if (this.usingCustomListRepo && this.hasListProperty(field)) {
      return `${this.listAlias}.${field}`;
    }
    if (this.hasEntityProperty(field)) {
      return `${this.alias}.${field}`;
    }
    if (!this.usingCustomListRepo && this.hasListProperty(field)) {
      return `${this.listAlias}.${field}`;
    }
    return null;
  }

  protected hasEntityProperty(prop: string): boolean {
    return !!this.repo.metadata.columns.find((c) => c.propertyName === prop);
  }

  protected hasListProperty(prop: string): boolean {
    return !!this.listRepo.metadata.columns.find((c) => c.propertyName === prop);
  }

  protected async mapListResult(
    rows: TEntity[],
    _query: any,
    _user?: any,
  ): Promise<TList[]> {
    return rows as unknown as TList[];
  }
}
