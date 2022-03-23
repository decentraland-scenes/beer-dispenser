export function CreateSound(
  audio: AudioClip,
  loop: boolean = false,
  transform?: Vector3
) {
  const sound = new Entity()
  engine.addEntity(sound)
  sound.addComponent(new AudioSource(audio))
  sound.getComponent(AudioSource).loop = loop
  sound.addComponent(new Transform())
  if (transform) {
    sound.getComponent(Transform).position = transform
  } else {
    sound.getComponent(Transform).position = Camera.instance.position
  }
  return sound
}
