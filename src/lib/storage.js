export const store = {
  get(key, area = localStorage) {
    try {
      return area.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value, area = localStorage) {
    try {
      if (value == null) area.removeItem(key)
      else area.setItem(key, value)
    } catch {
      /* storage unavailable (private mode) */
    }
  },
}
