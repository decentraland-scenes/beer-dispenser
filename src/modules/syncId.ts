@Component('syncId')
export class SyncId {
  id: string
  constructor(id: string) {
    this.id = id
  }
}

export const entitiesWithSyncId = engine.getComponentGroup(SyncId)

export function getEntityWithId(entityId: string): Entity | undefined {
  for (const entity of entitiesWithSyncId.entities) {
    if (entity.getComponent(SyncId).id === entityId) {
      return entity as Entity
    }
  }

  return undefined
}
