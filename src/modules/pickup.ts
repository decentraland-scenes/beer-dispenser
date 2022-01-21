@Component('pickedUp')
export class PickedUp {
  added: boolean = false
  lastPos: Vector3 = Vector3.Zero()
  playerId: string
  holdPosition: Vector3
  parentEntity: Entity
  // anchorPoint  TODO
  // holdRotation TODO
  // TODO, make input an object w properties
  constructor(playerId: string, holdPosition?: Vector3) {
    this.playerId = playerId
    this.holdPosition = holdPosition ? holdPosition : new Vector3(0, -1, 0.4)

    this.parentEntity = new Entity()
    engine.addEntity(this.parentEntity)

    log('ADDED PICKEDUP COMPONENT ', currentlyPickedUp)
  }
}

// TODO is creating a new parent entity each time a bad practice?

export let currentlyPickedUp = engine.getComponentGroup(PickedUp)

export class PickUpSystem implements ISystem {
  update() {
    for (let entity of currentlyPickedUp.entities) {
      if (!entity.getComponent(PickedUp).added) {
        this.pickUp(entity as Entity)
      }
    }
  }

  pickUp(entity: Entity) {
    let picked = entity.getComponent(PickedUp)

    picked.added = true

    log('PICKING UP FOR ', picked.playerId)
    if (entity.hasComponent(Transform)) {
      picked.lastPos = entity.getComponent(Transform).position
    }

    // entity.beerBaseState = BeerBaseState.NONE
    picked.parentEntity.addComponentOrReplace(
      new AttachToAvatar({
        avatarId: picked.playerId,
        anchorPointId: AttachToAvatarAnchorPointId.NameTag,
      })
    )

    entity.setParent(picked.parentEntity)

    entity.getComponent(Transform).position = picked.holdPosition
    entity.getComponent(Transform).rotate(Vector3.Right(), -10)

    //let index: number | undefined = undefined
    // for (let i = 0; i < players.length; i++) {
    //   if (players[i].userId === playerId) {
    // 	index = i
    //   }

    // if beer was in someone else's hand, remove it
    //   if (players[i].beer && players[i].beer!.id === this.id) {
    // 	players[i].holdingBeerGlass = false
    // 	players[i].beer = undefined
    //   }
    //}
    // if (index !== undefined && index === thisPlayerIndex) {
    //   // picked up by current player (delay slightly to prevent picking and dropping simultaneously)
    //   this.addComponentOrReplace(
    // 	new utils.Delay(100, () => {
    // 	  players[index!].holdingBeerGlass = true
    // 	  players[index!].beer = this
    // 	})
    //   )
    // } else if (index !== undefined) {
    //   // picked up by other player tracked by the scene
    //   players[index].holdingBeerGlass = true
    //   players[index].beer = this
    // } else {
    //   // picked up by other player NOT tracked by the scene yet
    //   players.push({
    // 	userId: playerId,
    // 	holdingBeerGlass: true,
    // 	beer: this,
    // 	isCurrentPlayer: false,
    //   })
    // }
  }
}

engine.addSystem(new PickUpSystem())

// TODO : add system to engine when creating component

export function checkIfPicking(playerId: string): boolean {
  let isPicking = false
  for (let entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).playerId == playerId &&
      entity.getComponent(PickedUp).added
    ) {
      isPicking = true
    }
  }

  return isPicking
}

export function getPickedUpItem(playerId: string): Entity | null {
  let isPicking = false
  for (let entity of currentlyPickedUp.entities) {
    if (
      entity.getComponent(PickedUp).playerId == playerId &&
      entity.getComponent(PickedUp).added
    ) {
      return entity as Entity
    }
  }

  return null
}
