import { BeerBaseState } from './beerGlass'
import * as utils from '@dcl/ecs-scene-utils'
import { currentPlayerId } from './trackPlayers'
import { entitiesWithSyncId, SyncId } from './syncId'
import { sceneMessageBus } from './messageBus'
import { noSign } from './ui'
import { Sound } from './sound'

type pickupComponentArguments = {
  holdPosition?: Vector3
  lastPos?: Vector3
  putDownSound?: string
  anchorPoint?: AttachToAvatarAnchorPointId
  holdRotation?: Quaternion
}

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
  // TODO, make input an object w properties
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

// TODO is creating a new parent entity each time a bad practice?

export let currentlyPickedUp = engine.getComponentGroup(PickedUp)

// Sound
const errorSound = new Sound(new AudioClip('sounds/error.mp3'))

export class PickUpSystem implements ISystem {
  update() {
    for (let entity of currentlyPickedUp.entities) {
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
      // holdRotation TODO
    })
  }

  constructor() {
    Input.instance.subscribe(
      'BUTTON_DOWN',
      ActionButton.PRIMARY,
      true,
      (event) => {
        if (currentPlayerId === undefined) return
        let pickedUpItem = getPickedUpItem(currentPlayerId)
        log('HOLDING BEER? ', pickedUpItem)
        if (pickedUpItem && event.hit) {
          if (event.hit.normal.y > 0.99) {
            let beerPosition: Vector3

            sceneMessageBus.emit('putDownItem', {
              id: pickedUpItem.getComponent(SyncId).id,
              position: event.hit.hitPoint,
              //   beerState: BeerBaseState.NONE,
              userId: currentPlayerId,
            })

            // place beer under taps
            // switch (event.hit.meshName) {
            //   case 'redBase_collider':
            // 	beerPosition = beerDispenser
            // 	  .getComponent(Transform)
            // 	  .position.clone()
            // 	  .subtract(new Vector3(0.368, -0.02, 0.31))
            // 	sceneMessageBus.emit('BeerGlassPutDown', {
            // 	  id: pickedUpItem.getComponent(SyncId).id,
            // 	  position: beerPosition,
            // 	  beerState: BeerBaseState.RED_BEER,
            // 	  userId: currentPlayerId,
            // 	})
            // 	break
            //   case 'yellowBase_collider':
            // 	beerPosition = beerDispenser
            // 	  .getComponent(Transform)
            // 	  .position.clone()
            // 	  .subtract(new Vector3(0, -0.02, 0.31))

            // 	sceneMessageBus.emit('BeerGlassPutDown', {
            // 	  id: pickedUpItem.getComponent(SyncId).id,
            // 	  position: beerPosition,
            // 	  beerState: BeerBaseState.YELLOW_BEER,
            // 	  userId: currentPlayerId,
            // 	})

            // 	break
            //   case 'greenBase_collider':
            // 	beerPosition = beerDispenser
            // 	  .getComponent(Transform)
            // 	  .position.clone()
            // 	  .subtract(new Vector3(-0.368, -0.02, 0.31))

            // 	sceneMessageBus.emit('BeerGlassPutDown', {
            // 	  id: pickedUpItem.getComponent(SyncId).id,
            // 	  position: beerPosition,
            // 	  beerState: BeerBaseState.GREEN_BEER,
            // 	  userId: currentPlayerId,
            // 	})

            // 	break
            //   default:
            // 	// place beer anywhere else that's flat

            // 	break
            // }
          } else {
            noSign.show(1)
            errorSound.getComponent(AudioSource).playOnce()
          }
        }
      }
    )

    // reset item on leave
    onLeaveSceneObservable.add((player) => {
      for (let entity of currentlyPickedUp.entities) {
        if (entity.getComponent(PickedUp).userId === player.userId) {
          resetEntity(entity as Entity)
        }
      }
    })

    sceneMessageBus.on('pickUpItem', (itemState: any) => {
      let pickedUpEntity: Entity | undefined = undefined

      for (let entity of entitiesWithSyncId.entities) {
        if (entity.getComponent(SyncId).id === itemState.id) {
          pickedUpEntity = entity as Entity
        }
      }

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
      let droppedEntity: Entity | undefined = undefined

      for (let entity of entitiesWithSyncId.entities) {
        if (entity.getComponent(SyncId).id === itemState.id) {
          droppedEntity = entity as Entity
        }
      }

      if (!droppedEntity) return

      putDown(
        droppedEntity,
        itemState.position
        // beerGlassState.beerState
      )
    })
  }
}

// TODO : add system to engine when creating component

export function checkIfPicking(userId: string): boolean {
  let isPicking = false
  for (let entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).userId == userId &&
      entity.getComponent(PickedUp).added
    ) {
      isPicking = true
    }
  }

  return isPicking
}

export function getPickedUpItem(userId: string): Entity | null {
  let isPicking = false
  for (let entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).userId == userId &&
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
    // beer was stolen from another player's hand

    let oldLastPos = entity.getComponent(PickedUp).lastPos
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

  let picked = entity.getComponent(PickedUp)

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

export function putDown(
  entity: Entity,
  placePosition: Vector3,
  placeRotation?: Quaternion
  //beerBaseState?: BeerBaseState
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

  // this.beerBaseState = beerBaseState
}
