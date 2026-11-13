import pc from './pc.mjs'
import programming from './programming.mjs'
import graphics from './graphics.mjs'
import game from './game.mjs'

export const categories = [pc, programming, graphics, game]
export const categoryUrl = id => '/glossary/' + id + '.html'
export const termsById = new Map(categories.flatMap(category =>
  category.terms.map(term => [category.id + ':' + term.id, term])))

export function termUrl(key) {
  const [category, term] = key.split(':')
  return categoryUrl(category) + '#' + term
}

export function normalizeGlossaryQuery(text) {
  return text.normalize('NFKC').toLowerCase()
    .replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[‐‑‒–—−]/g, '-')
    .trim()
}
