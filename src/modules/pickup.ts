import * as utils from '@dcl/ecs-scene-utils'
import { currentPlayerId } from './trackPlayers'
import { getEntityWithId, SyncId } from './syncId'
import { sceneMessageBus } from './messageBus'
import { noSign } from './ui'
import { CreateSound } from './sound'

export type pickupComponentArguments = {
  holdPosition?: Vector3
  lastPos?: Vector3
  putDownSound?: string
  anchorPoint?: AttachToAvatarAnchorPointId
  holdRotation?: Quaternion
}

export type putDownEventData = {
  userId: string
  pickedUpItem: string
  dropOnItem: string
  hit: {
    length: number
    hitPoint: ReadOnlyVector3
    meshName: string
    normal: ReadOnlyVector3
    worldNormal: ReadOnlyVector3
    entityId: string
  }
}

// TODO is creating a new parent entity each time I pick up an item a bad practice?

@Component('pickedUp')
export class PickedUp {
  added: boolean = false
  lastPos: Vector3
  userId: string
  holdPosition: Vector3
  parentEntity: Entity
  putDownSound: string | undefined
  anchorPoint: AttachToAvatarAnchorPointId | undefined
  holdRotation: Quaternion
  constructor(userId: string, args: pickupComponentArguments) {
    this.userId = userId
    this.holdPosition = args.holdPosition
      ? args.holdPosition
      : new Vector3(0, -1, 0.4)

    this.holdRotation = args.holdRotation
      ? args.holdRotation
      : Quaternion.Zero()

    this.lastPos = args.lastPos ? args.lastPos : Vector3.Zero()
    this.parentEntity = new Entity()
    engine.addEntity(this.parentEntity)

    if (args.putDownSound) {
      this.putDownSound = args.putDownSound
      this.parentEntity.addComponent(
        new AudioSource(new AudioClip(args.putDownSound))
      )
    }

    log('ADDED PICKEDUP COMPONENT ', currentlyPickedUp)
  }
}

@Component('onDropItem')
export class OnDropItem {
  acceptedIds: string[]
  dropFunction: (data: putDownEventData) => void
  //   messageBusSync: boolean

  constructor(
    acceptedIds: string[],
    dropFunction: (data: putDownEventData) => void
    // messageBusSync?: boolean
  ) {
    this.acceptedIds = acceptedIds
    this.dropFunction = dropFunction
    // this.messageBusSync = messageBusSync ? messageBusSync : true
  }

  acceptsId(id: string): boolean {
    if (this.acceptedIds.length === 0) return true
    for (const acceptedId of this.acceptedIds) {
      if (acceptedId === id) {
        return true
      }
    }
    return false
  }
}

export const currentlyPickedUp = engine.getComponentGroup(PickedUp)

// Sound
const errorSound = CreateSound(new AudioClip('sounds/error.mp3'))

export class PickUpSystem implements ISystem {
  update() {
    for (const entity of currentlyPickedUp.entities) {
      if (!entity.getComponent(PickedUp).added) {
        this.pickUp(entity as Entity)
      }
    }
  }

  pickUp(entity: Entity) {
    sceneMessageBus.emit('pickUpItem', {
      id: entity.getComponent(SyncId).id,
      userId: entity.getComponent(PickedUp).userId,
      holdPosition: entity.getComponent(PickedUp).holdPosition,
      holdRotation: entity.getComponent(PickedUp).holdRotation,
      lastPos: entity.getComponent(PickedUp).lastPos,
      anchorPoint: entity.getComponent(PickedUp).anchorPoint,
      putDownSound: entity.getComponent(PickedUp).putDownSound,
    })
  }

  constructor() {
    Input.instance.subscribe(
      'BUTTON_DOWN',
      ActionButton.PRIMARY,
      true,
      (event) => {
        if (currentPlayerId === undefined) return
        const pickedUpItem = getPickedUpItem(currentPlayerId)
        log('HOLDING ITEM? ', pickedUpItem)
        if (pickedUpItem && event.hit) {
          if (event.hit.normal.y > 0.99) {
            sceneMessageBus.emit('putDownItem', {
              id: pickedUpItem.getComponent(SyncId).id,
              position: event.hit.hitPoint,
              userId: currentPlayerId,
            })

            const hitEntity = engine.entities[event.hit.entityId]

            if (!hitEntity.hasComponent(SyncId)) {
              log('Hit entity has no SyncId Component!')
              return
            }

            // OnDropItem on hit entity
            if (
              hitEntity.hasComponent(OnDropItem) &&
              pickedUpItem.hasComponent(SyncId) &&
              hitEntity
                .getComponent(OnDropItem)
                .acceptsId(pickedUpItem.getComponent(SyncId).id)
            ) {
              sceneMessageBus.emit('runOnDropFunction', {
                userId: currentPlayerId,
                pickedUpItem: pickedUpItem.getComponent(SyncId).id,
                dropOnItem: hitEntity.getComponent(SyncId).id,
                hit: event.hit,
              })
            }
          } else {
            noSign.show(1)
            errorSound.getComponent(AudioSource).playOnce()
          }
        }
      }
    )

    // reset item on leave
    onLeaveSceneObservable.add((player) => {
      for (const entity of currentlyPickedUp.entities) {
        if (entity.getComponent(PickedUp).userId === player.userId) {
          resetEntity(entity as Entity)
        }
      }
    })

    sceneMessageBus.on('pickUpItem', (itemState: any) => {
      const pickedUpEntity = getEntityWithId(itemState.id)

      if (!pickedUpEntity) return

      pickUpEntity(
        pickedUpEntity,
        itemState.userId,
        itemState.holdPosition,
        itemState.holdRotation,
        itemState.lastPos,
        itemState.putDownSound,
        itemState.anchorPoint
      )
    })

    sceneMessageBus.on('putDownItem', (itemState: any) => {
      const droppedEntity = getEntityWithId(itemState.id)

      if (!droppedEntity) return

      putDownEntity(droppedEntity, itemState.position)
    })

    sceneMessageBus.on('runOnDropFunction', (data: putDownEventData) => {
      const dropOnItem = getEntityWithId(data.dropOnItem)
      const pickedUpItem = getEntityWithId(data.pickedUpItem)

      if (!dropOnItem || !pickedUpItem) return

      dropOnItem.getComponent(OnDropItem).dropFunction({
        userId: data.userId,
        pickedUpItem: pickedUpItem.getComponent(SyncId).id,
        dropOnItem: dropOnItem.getComponent(SyncId).id,
        hit: data.hit,
      })
    })
  }
}

export function checkIfHolding(userId: string): boolean {
  let isPicking = false
  for (const entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).userId === userId &&
      entity.getComponent(PickedUp).added
    ) {
      isPicking = true
    }
  }

  return isPicking
}

export function getPickedUpItem(userId: string): Entity | null {
  for (const entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).userId === userId &&
      entity.getComponent(PickedUp).added
    ) {
      return entity as Entity
    }
  }

  return null
}

export function resetEntity(entity: Entity) {
  if (!entity.hasComponent(PickedUp)) return

  entity.setParent(null)

  entity.addComponentOrReplace(
    new Transform({
      position: entity.getComponent(PickedUp).lastPos,
      rotation: Quaternion.Zero(),
    })
  )
  engine.removeEntity(entity.getComponent(PickedUp).parentEntity)
  entity.removeComponent(PickedUp)
}

export function pickUpEntity(
  entity: Entity,
  userId: string,
  holdPosition: Vector3,
  holdRotation?: Quaternion,
  lastPos?: Vector3,
  putDownSound?: string,
  anchorPoint?: AttachToAvatarAnchorPointId
) {
  if (!entity.hasComponent(PickedUp)) {
    entity.addComponentOrReplace(
      new PickedUp(userId, {
        holdPosition: holdPosition,
        holdRotation: holdRotation,
        putDownSound: putDownSound,
        anchorPoint: anchorPoint,
        lastPos: lastPos,
      })
    )
  } else if (entity.getComponent(PickedUp).userId !== userId) {
    // item was stolen from another player's hand

    const oldLastPos = entity.getComponent(PickedUp).lastPos
    entity.addComponentOrReplace(
      new PickedUp(userId, {
        holdPosition: holdPosition,
        holdRotation: holdRotation,
        putDownSound: putDownSound,
        anchorPoint: anchorPoint,
        lastPos: oldLastPos,
      })
    )
  } else if (entity.getComponent(PickedUp).added) {
    return
  }

  const picked = entity.getComponent(PickedUp)

  picked.added = true

  log('PICKING UP FOR ', picked.userId)

  picked.parentEntity.addComponentOrReplace(
    new AttachToAvatar({
      avatarId: picked.userId,
      anchorPointId: AttachToAvatarAnchorPointId.NameTag,
    })
  )

  entity.setParent(picked.parentEntity)

  entity.getComponent(Transform).position = picked.holdPosition
  entity.getComponent(Transform).rotation = picked.holdRotation
}

export function putDownEntity(
  entity: Entity,
  placePosition: Vector3,
  placeRotation?: Quaternion
) {
  if (!entity.hasComponent(PickedUp)) return

  if (entity.getComponent(PickedUp).putDownSound) {
    entity
      .getComponent(PickedUp)
      .parentEntity.getComponent(AudioSource)
      .playOnce()
  }

  entity.setParent(null)

  entity.addComponent(
    new utils.Delay(250, () => {
      engine.removeEntity(entity.getComponent(PickedUp).parentEntity)
      entity.removeComponent(PickedUp)
    })
  )

  entity.addComponentOrReplace(
    new Transform({
      position: placePosition,
      rotation: placeRotation ? placeRotation : Quaternion.Zero(),
    })
  )
}
