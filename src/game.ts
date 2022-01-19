import { BeerBaseState } from './modules/beerGlass'
import { Sound } from './modules/sound'

import { beerDispenser } from './modules/tap'
import { sceneMessageBus } from './messageBus'
import { players, thisPlayerIndex } from './modules/trackPlayers'
import { noSign } from './modules/ui'

// Base
const base = new Entity()
base.addComponent(new GLTFShape('models/baseDarkWithCollider.glb'))
engine.addEntity(base)

// Sound
const errorSound = new Sound(new AudioClip('sounds/error.mp3'))

// Tables
const tables = new Entity()
tables.addComponent(new GLTFShape('models/tables.glb'))
tables.addComponent(new Transform())
engine.addEntity(tables)

// Instance the input object
const input = Input.instance

input.subscribe('BUTTON_DOWN', ActionButton.PRIMARY, true, (event) => {
  if (thisPlayerIndex === undefined) return
  log('HOLDING BEER? ', players[thisPlayerIndex].holdingBeerGlass, event.hit)
  if (
    players[thisPlayerIndex].holdingBeerGlass &&
    players[thisPlayerIndex].beer &&
    event.hit
  ) {
    if (event.hit.normal.y > 0.99) {
      let beerPosition: Vector3
      // place beer under taps
      switch (event.hit.meshName) {
        case 'redBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(0.368, -0.02, 0.31))
          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.RED_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })
          break
        case 'yellowBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(0, -0.02, 0.31))

          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.YELLOW_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })

          break
        case 'greenBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(-0.368, -0.02, 0.31))

          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.GREEN_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })

          break
        default:
          // place beer anywhere else that's flat
          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: event.hit.hitPoint,
            beerState: BeerBaseState.NONE,
            carryingPlayer: players[thisPlayerIndex].userId,
          })
          break
      }
    } else {
      noSign.show(1)
      errorSound.getComponent(AudioSource).playOnce()
    }
  }
})

// drink
input.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  if (
    players[thisPlayerIndex].holdingBeerGlass &&
    players[thisPlayerIndex].beer &&
    players[thisPlayerIndex].beer?.isFull
  ) {
    sceneMessageBus.emit('BeerGlassDrink', {
      id: players[thisPlayerIndex].beer!.id,
    })
  }
})
