import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { Player } from '../player'
import { playersCarryingBeer, thisPlayer } from './trackPlayers'
import { sceneMessageBus } from 'src/messageBus'

// Track player's state
export enum BeerBaseState {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen',
}

// Multiplayer
type BeerGlassState = {
  id: number
  position: Vector3
  beerState: BeerBaseState
  carryingPlayer: string
}

// Sound
const pickUpSound = new Sound(new AudioClip('sounds/pickUp.mp3'))
const putDownSound = new Sound(new AudioClip('sounds/putDown.mp3'))
const swallowSound = new Sound(new AudioClip('sounds/swallow.mp3'))

export class BeerGlass extends Entity {
  public id: number
  public isFull: boolean = false
  public beerBaseState: BeerBaseState = BeerBaseState.NONE
  public lastPos: Vector3
  public glass: Entity

  constructor(
    id: number,
    model: GLTFShape,
    position: Vector3,
    public holdPosition: Vector3,
    public rotatePosition: number
  ) {
    super()
    this.addComponent(new Transform({ position: position }))
    engine.addEntity(this)

    this.id = id

    this.glass = new Entity()
    this.glass.addComponent(new Transform())
    this.glass.addComponent(model)

    engine.addEntity(this.glass)
    this.glass.setParent(this)
    this.lastPos = position

    this.glass.addComponent(new Animator())
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('Blank', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourRed', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourYellow', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourGreen', { looping: false }))
    this.glass.getComponent(Animator).getClip('Blank').play()

    this.glass.addComponent(
      new OnPointerDown(
        (e) => {
          if (!Player.holdingBeerGlass) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.id,
              position: this.holdPosition,
              carryingPlayer: thisPlayer,
            })
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )

    /// FOR DEBUG: NUMBERS ON BEERS
    let label = new Entity()
    label.setParent(this.glass)
    label.addComponent(
      new Transform({
        position: new Vector3(0, 0.4, 0),
        scale: new Vector3(0.2, 0.2, 0.2),
      })
    )
    label.addComponent(new TextShape(this.id.toString()))
  }

  playPourAnim() {
    sceneMessageBus.emit('BeerGlassPourAnim', {
      id: this.id,
      position: this.holdPosition,
    })
  }

  stopAnimations() {
    this.glass.getComponent(Animator).getClip('Blank').stop()
    this.glass.getComponent(Animator).getClip('PourRed').stop()
    this.glass.getComponent(Animator).getClip('PourYellow').stop()
    this.glass.getComponent(Animator).getClip('PourGreen').stop()
  }

  public pickup(playerId: string): void {
    this.lastPos = this.glass.getComponent(Transform).position
    this.beerBaseState = BeerBaseState.NONE
    this.setParent(null)
    if (this.hasComponent(AttachToAvatar)) {
      this.removeComponent(AttachToAvatar)
    }

    pickUpSound.getComponent(AudioSource).playOnce()

    if (playerId !== thisPlayer) {
      log('PICKING UP FOR ', playerId)
      this.addComponentOrReplace(
        new AttachToAvatar({
          avatarId: playerId,
          anchorPointId: AttachToAvatarAnchorPointId.NameTag,
        })
      )
    } else {
      log('PICKING UP FOR ME', playerId)
      this.setParent(Attachable.FIRST_PERSON_CAMERA)
      this.addComponentOrReplace(new Transform())

      this.addComponentOrReplace(
        new utils.Delay(100, () => {
          Player.holdingBeerGlass = true
        })
      )
    }

    this.glass.getComponent(Transform).position = this.holdPosition
    this.glass
      .getComponent(Transform)
      .rotate(Vector3.Right(), this.rotatePosition)

    let index: number | undefined = undefined
    for (let i = 0; i < playersCarryingBeer.length; i++) {
      if (playersCarryingBeer[i].id === playerId) {
        index = i
      }

      // someone stole the beer from your hands
      if (
        playersCarryingBeer[i] &&
        playersCarryingBeer[i].id === thisPlayer &&
        playersCarryingBeer[i].beer &&
        playersCarryingBeer[i].beer!.id === this.id
      ) {
        Player.holdingBeerGlass = false
      }
    }
    if (index) {
      playersCarryingBeer[index].beer = this
    } else {
      playersCarryingBeer.push({
        id: playerId,
        beer: this,
      })
    }
  }

  putDown(
    placePosition: Vector3,
    beerBaseState: BeerBaseState,
    playerId: string
  ): void {
    if (this.hasComponent(AttachToAvatar)) {
      this.removeComponent(AttachToAvatar)
    } else {
      this.setParent(null)
    }

    this.addComponentOrReplace(
      new Transform({
        position: placePosition,
        rotation: Quaternion.Zero(),
      })
    )
    putDownSound.getComponent(AudioSource).playOnce()

    this.glass.getComponent(Transform).position = Vector3.Zero()
    this.glass.getComponent(Transform).rotation = Quaternion.Zero()

    this.beerBaseState = beerBaseState

    // you put the beer down
    if (playerId === thisPlayer) {
      Player.holdingBeerGlass = false
    }

    let index: number | undefined = undefined
    for (let i = 0; i < playersCarryingBeer.length; i++) {
      if (playersCarryingBeer[i].id === playerId) {
        index = i
      }

      // someone stole the beer from your hands & put it down
      if (
        playersCarryingBeer[i] &&
        playersCarryingBeer[i].id === thisPlayer &&
        playersCarryingBeer[i].beer &&
        playersCarryingBeer[i].beer!.id === this.id
      ) {
        Player.holdingBeerGlass = false
      }
    }
    if (index) {
      playersCarryingBeer[index].beer = undefined
    }
  }

  drink(id: number): void {
    swallowSound.getComponent(AudioSource).playOnce()
    sceneMessageBus.emit('BeerGlassDrink', { id: id })
  }

  reset() {
    this.setParent(null)
    if (this.hasComponent(AttachToAvatar)) {
      this.removeComponent(AttachToAvatar)
    }
    this.getComponent(Transform).position = this.lastPos
    this.glass.getComponent(Transform).position = Vector3.Zero()
    this.beerBaseState = BeerBaseState.NONE
    this.isFull = false
  }

  addPointerDown() {
    this.glass.addComponent(
      new OnPointerDown(
        () => {
          if (!Player.holdingBeerGlass) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.id,
              position: this.holdPosition,
              carryingPlayer: thisPlayer,
            })
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )
  }
}

sceneMessageBus.on('BeerGlassPickedUp', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].pickup(beerGlassState.carryingPlayer)

  log(
    'PICKED UP GLASS ',
    beerGlassState.id,
    ' by ',
    beerGlassState.carryingPlayer,
    ' beer state ',
    beerGlassState.beerState
  )
})

sceneMessageBus.on('BeerGlassPutDown', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].putDown(
    beerGlassState.position,
    beerGlassState.beerState,
    beerGlassState.carryingPlayer
  )
  log(
    'PUTTING DOWN GLASS ',
    beerGlassState.id,
    ' at ',
    beerGlassState.position,
    ' by ',
    beerGlassState.carryingPlayer,
    ' beer state ',
    beerGlassState.beerState
  )
})

sceneMessageBus.on('BeerGlassDrink', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].isFull = false
  beerGlasses[beerGlassState.id].stopAnimations()
  beerGlasses[beerGlassState.id].glass
    .getComponent(Animator)
    .getClip('Blank')
    .play()
})

sceneMessageBus.on('BeerGlassPourAnim', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].isFull = true
  beerGlasses[beerGlassState.id].stopAnimations()
  beerGlasses[beerGlassState.id].glass
    .getComponent(Animator)
    .getClip(beerGlasses[beerGlassState.id].beerBaseState)
    .play()
  beerGlasses[beerGlassState.id].glass.removeComponent(OnPointerDown)
  beerGlasses[beerGlassState.id].addComponent(
    new utils.Delay(2500, () => {
      beerGlasses[beerGlassState.id].addPointerDown()
    })
  )
})

// Beer glasses
const beerGlassShape = new GLTFShape('models/beerGlass.glb')

// NOTE: We're matching the beer object's position in the array with the id
const beerGlass1 = new BeerGlass(
  0,
  beerGlassShape,
  new Vector3(8.3, 1.25, 8),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass2 = new BeerGlass(
  1,
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass3 = new BeerGlass(
  2,
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass4 = new BeerGlass(
  3,
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass5 = new BeerGlass(
  4,
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass6 = new BeerGlass(
  5,
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass7 = new BeerGlass(
  6,
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass8 = new BeerGlass(
  7,
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass9 = new BeerGlass(
  8,
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  new Vector3(0, -0.4, 0.5),
  -10
)
const beerGlass10 = new BeerGlass(
  9,
  beerGlassShape,
  new Vector3(1.8, 0.8, 2.3),
  new Vector3(0, -0.4, 0.5),
  -10
)

export const beerGlasses: BeerGlass[] = [
  beerGlass1,
  beerGlass2,
  beerGlass3,
  beerGlass4,
  beerGlass5,
  beerGlass6,
  beerGlass7,
  beerGlass8,
  beerGlass9,
  beerGlass10,
]
