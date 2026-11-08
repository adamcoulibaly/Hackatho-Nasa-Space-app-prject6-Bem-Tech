/** Série GRACE de test : 21 années (2005–2025) avec la lacune 2017–2018 entre les deux missions. */
export const GRACE_TEST = [3, 4, 2, 5, 3, 1, 2, 0, -1, 1, -2, -1, null, null, -3, -2, -4, -3, -2, -4, -5].map((ecart, i) => ({ annee: 2005 + i, ecart }));
