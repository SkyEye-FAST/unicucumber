declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<
    {
      hexValue: string
      width: number
      displayMode?: string
    },
    object,
    object
  >
  export default component
}
