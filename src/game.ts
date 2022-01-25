import { BeerBaseState, BeerGlass } from './modules/beerGlass'
import { Sound } from './modules/sound'

import { beerDispenser } from './modules/tap'
import { sceneMessageBus } from './modules/messageBus'
import { noSign } from './modules/ui'
import { getPickedUpItem, PickUpSystem } from './modules/pickup'
import { SyncId } from './modules/syncId'
import { currentPlayerId } from './modules/trackPlayers'

// Tables
const tables = new Entity()
tables.addComponent(new GLTFShape('models/tables.glb'))
tables.addComponent(new Transform())
engine.addEntity(tables)

engine.addSystem(new PickUpSystem())

// Taps Base
const base = new Entity()
base.addComponent(new GLTFShape('models/baseDarkWithCollider.glb'))
engine.addEntity(base)

// drink
Input.instance.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  let pickedUpItem = getPickedUpItem(currentPlayerId) as BeerGlass
  if (!pickedUpItem) return
  if ((pickedUpItem.getComponent(SyncId).id, pickedUpItem.isFull)) {
    sceneMessageBus.emit('BeerGlassDrink', {
      id: pickedUpItem.getComponent(SyncId).id,
    })
  }
})
