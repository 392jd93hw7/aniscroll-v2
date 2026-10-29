export type LibraryStatus = "Currently Watching" | "Completed" | "Plan to Watch" | "On Hold" | "Dropped"
export const libraryStatuses: LibraryStatus[] = [
  "Currently Watching",
  "Completed",
  "Plan to Watch",
  "On Hold",
  "Dropped",
]
export type ViewingProgress = {
  episode: number
  season: number
  progress: number
}

// A deliberately small, static preview catalog—not a live streaming inventory.
const stories: Record<string, {
  synopsis: string
  alternative: string
  studio: string
  season: string
  seasons: number
  episodes: string[]
}> = {
  "Demon Slayer: Kimetsu no Yaiba": {
    alternative: "鬼滅の刃 · Kimetsu no Yaiba",
    studio: "ufotable",
    season: "Spring",
    seasons: 2,
    synopsis:
      "After a demon attack shatters his family, Tanjiro Kamado sets out to find a cure for his sister Nezuko. With a sword in hand and compassion in his heart, he enters a world where humanity’s last defenders battle the night.",
    episodes: [
      "Cruelty",
      "Trainer Sakonji Urokodaki",
      "Sabito and Makomo",
      "Final Selection",
      "My Own Steel",
      "Swordsman Accompanying a Demon",
    ],
  },
  "Jujutsu Kaisen": {
    alternative: "呪術廻戦 · Jujutsu Kaisen",
    studio: "MAPPA",
    season: "Fall",
    seasons: 2,
    synopsis:
      "When Yuji Itadori swallows a cursed talisman to save his friends, he becomes the vessel of a terrifying power. At Tokyo Jujutsu High, he joins a secret world of sorcerers fighting the curses born from human fear.",
    episodes: [
      "Ryomen Sukuna",
      "For Myself",
      "Girl of Steel",
      "Curse Womb Must Die",
      "Curse Womb Must Die II",
      "After Rain",
    ],
  },
  "Solo Leveling": {
    alternative: "俺だけレベルアップな件 · Ore dake Level Up na Ken",
    studio: "A-1 Pictures",
    season: "Winter",
    seasons: 2,
    synopsis:
      "Known as the weakest hunter, Sung Jinwoo barely survives the dangerous dungeons that connect his world to another. A mysterious system offers him something no other hunter has: the power to level up.",
    episodes: [
      "I’m Used to It",
      "If I Had One More Chance",
      "It’s Like a Game",
      "I’ve Gotta Get Stronger",
      "A Pretty Good Deal",
      "The Real Hunt Begins",
    ],
  },
  "Frieren: Beyond Journey’s End": {
    alternative: "葬送のフリーレン · Sousou no Frieren",
    studio: "Madhouse",
    season: "Fall",
    seasons: 1,
    synopsis:
      "The Demon King is defeated, but the journey is far from over. For the elf mage Frieren, a lifetime passes in the blink of an eye. A new adventure with young companions becomes a quiet search for the meaning of the years she shared with her old friends.",
    episodes: [
      "The Journey’s End",
      "It Didn’t Have to Be Magic…",
      "Killing Magic",
      "The Land Where Souls Rest",
      "Phantoms of the Dead",
      "The Hero of the Village",
    ],
  },
  "Attack on Titan": {
    alternative: "進撃の巨人 · Shingeki no Kyojin",
    studio: "WIT Studio / MAPPA",
    season: "Spring",
    seasons: 2,
    synopsis:
      "For a century, humanity has lived behind enormous walls, protected from the Titans outside. When the walls are breached, Eren Yeager vows to fight back—and discovers that the truth beyond them is more unsettling than anyone imagined.",
    episodes: [
      "To You, in 2000 Years",
      "That Day",
      "A Dim Light Amid Despair",
      "The Night of the Closing Ceremony",
      "First Battle",
      "The World the Girl Saw",
    ],
  },
  "One Piece": {
    alternative: "ワンピース · One Piece",
    studio: "Toei Animation",
    season: "Fall",
    seasons: 1,
    synopsis:
      "Monkey D. Luffy has one dream: to become King of the Pirates. Together with an unlikely crew, he sails into a vast world of extraordinary islands, fierce rivals, and friendships stronger than any storm.",
    episodes: [
      "I’m Luffy! The Man Who’s Gonna Be King of the Pirates!",
      "Enter the Great Swordsman!",
      "Morgan versus Luffy!",
      "Luffy’s Past!",
      "Captain Buggy!",
      "The Beast Tamer",
    ],
  },
  "Your Name.": {
    alternative: "君の名は。 · Kimi no Na wa.",
    studio: "CoMix Wave Films",
    season: "Summer",
    seasons: 1,
    synopsis:
      "Mitsuha dreams of leaving her quiet mountain town. Taki lives a busy life in Tokyo. When the two strangers begin waking up in each other’s bodies, a connection grows across distance—and a race against time begins to find the person they have never truly met.",
    episodes: ["Your Name. — Feature film"],
  },
  "SPY × FAMILY": {
    alternative: "スパイファミリー · Spy Family",
    studio: "WIT Studio / CloverWorks",
    season: "Spring",
    seasons: 2,
    synopsis:
      "A spy needs a family to complete his next mission. The wife he recruits is secretly an assassin, and their adopted daughter can read minds. Keeping the peace at home might be their most dangerous assignment yet.",
    episodes: [
      "Operation Strix",
      "Secure a Wife",
      "Prepare for the Interview",
      "The Prestigious School’s Interview",
      "Will They Pass or Fail?",
      "The Friendship Scheme",
    ],
  },
}
export function storyFor(title: string) {
  return stories[title]
}
export function isFilm(title: string) {
  return title === "Your Name."
}
export function runtimeFor(title: string) {
  return isFilm(title) ? 6360 : 1450
}
export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds))
  return value >= 3600
    ? `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`
    : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`
}