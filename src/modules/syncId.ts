@Component('syncId')
export class SyncId {
  id: string | number
  constructor(id: string | number) {
    this.id = id
  }
}

export let entitiesWithSyncId = engine.getComponentGroup(SyncId)
