import request from 'supertest';
const os = require('os');

const baseUrl = 'http://127.0.0.1:3000';

describe('Tests de performance améliorés de l\'API', () => {
    jest.setTimeout(30 * 60 * 1000);

    const utilisateursConcurrents = 1000;

    const itérations = 1000;

    const duréeTest = 10 * 60 * 1000; // 10 minutes

    const mesurerTempsRéponse = async (requêteFn) => {
        const début = Date.now();
        await requêteFn();
        return Date.now() - début;
    };

    beforeAll(async () => {
        let tentatives = 5;
        while (tentatives > 0) {
            try {
                await request(baseUrl).get('/status');
                return;
            } catch {
                tentatives--;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        throw new Error('Serveur non prêt');
        const res = await request(baseUrl)
            .get('/login/')
            .query({ login: 'test', password: 'test' });
        expect(res.status).toBe(200);
    });

    /*________________________________*/
    // Tests de performance pour l'envoi de feedback
    describe('Tests de performance pour l\'envoi de feedback', () => {
        it(`Doit gérer ${utilisateursConcurrents} soumissions de feedback concurrentes`, async () => {
            const tempsRéponses = [];
            const tailleLot = 50;
            const lots = Math.ceil(utilisateursConcurrents / tailleLot);

            for (let i = 0; i < lots; i++) {
                const promessesLots = Array(Math.min(tailleLot, utilisateursConcurrents - i * tailleLot))
                    .fill()
                    .map(() => {
                        const début = Date.now();
                        return request(baseUrl)
                            .post('/feedback/')
                            .send({
                                name: `test${Math.floor(Math.random() * 1000)}`,
                                message: `test`
                            })
                            .then(res => {
                                expect([200, 429]).toContain(res.statusCode);
                                tempsRéponses.push(Date.now() - début);
                            });
                    });

                await Promise.all(promessesLots);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const tempsMoyen = tempsRéponses.reduce((a, b) => a + b, 0) / tempsRéponses.length;
            console.log(`Temps moyen pour l'envoi de feedback: ${tempsMoyen}ms`);
            console.log(`Total des soumissions de feedback traitées: ${tempsRéponses.length}`);
            console.log(`Taux de succès: ${tempsRéponses.length}/${utilisateursConcurrents}`);

            expect(tempsMoyen).toBeLessThan(2000);
        });
    });

    /*________________________________*/
    // Tests de charge pour l'endpoint Login
    describe('Tests de charge sur l\'endpoint Login', () => {
        it(`Gère ${itérations} requêtes de connexion successives`, async () => {
            const tempsRéponses = [];

            for (let i = 0; i < itérations; i++) {
                const tempsRéponse = await mesurerTempsRéponse(async () => {
                    const res = await request(baseUrl)
                        .get('/login/')
                        .query({ login: 'test', password: 'test' });
                    expect([200, 429]).toContain(res.statusCode);
                });
                tempsRéponses.push(tempsRéponse);
            }

            const tempsMoyen = tempsRéponses.reduce((a, b) => a + b, 0) / tempsRéponses.length;
            console.log(`Temps moyen de réponse pour les connexions successives: ${tempsMoyen}ms`);
            expect(tempsMoyen).toBeLessThan(500);
        });

        it(`Gère ${utilisateursConcurrents} requêtes de connexion concurrentes`, async () => {
            const tempsRéponses = [];

            const tailleLot = 50;

            const totalLots = Math.ceil(utilisateursConcurrents / tailleLot);

            for (let i = 0; i < totalLots; i++) {
                const promessesLots = Array(tailleLot).fill().map(() => {
                    const début = Date.now();
                    return request(baseUrl)
                        .get('/login/')
                        .query({ login: 'test', password: 'test' })
                        .then(res => {
                            expect([200, 429]).toContain(res.statusCode);
                            tempsRéponses.push(Date.now() - début);
                        });
                });

                await Promise.all(promessesLots);
            }

            const tempsMoyen = tempsRéponses.reduce((a, b) => a + b, 0) / tempsRéponses.length;
            console.log(`Temps moyen de réponse pour les connexions concurrentes: ${tempsMoyen}ms`);
            expect(tempsMoyen).toBeLessThan(1000);
        });
    });

    /*________________________________*/
    // Tests de performance sous charge prolongée
    describe('Tests sous charge prolongée', () => {
        it('Maintient une performance constante sous une charge soutenue', async () => {

            const résultats = [];

            const début = Date.now();

            while (Date.now() - début < duréeTest) {
                const promesses = Array(10).fill().map(() => mesurerTempsRéponse(async () => {
                    const res = await request(baseUrl)
                        .get('/login/')
                        .query({ login: 'test', password: 'test' });
                    expect([200, 429]).toContain(res.statusCode);
                }));

                const résultatsLots = await Promise.all(promesses);
                résultats.push(...résultatsLots);
            }

            const tempsMoyen = résultats.reduce((a, b) => a + b, 0) / résultats.length;
            console.log(`Temps moyen de réponse sous charge prolongée: ${tempsMoyen}ms`);
            expect(tempsMoyen).toBeLessThan(1000);
        });
    });

    /*________________________________*/
    // Tests de gestion des erreurs
    describe('Tests de gestion des erreurs', () => {
        it('Doit gérer rapidement les tentatives de connexion invalides', async () => {

            const tempsRéponse = await mesurerTempsRéponse(async () => {

                const res = await request(baseUrl)
                    .get('/login/')
                    .query({ login: 'invalide', password: 'invalide' });
                expect(res.statusCode).toBe(403);
            });

            console.log(`Temps de réponse pour la connexion invalide: ${tempsRéponse}ms`);
            expect(tempsRéponse).toBeLessThan(200);
        });

        it('Doit gérer rapidement les jetons d\'authentification invalides', async () => {
            const tempsRéponse = await mesurerTempsRéponse(async () => {
                const res = await request(baseUrl)
                    .get('/auth/')
                    .set('Authorization', 'jeton_invalide');
                expect(res.statusCode).toBe(403);
            });

            console.log(`Temps de réponse pour le jeton invalide: ${tempsRéponse}ms`);
            expect(tempsRéponse).toBeLessThan(100);
        });
    });

    /*________________________________*/
    // Tests de surveillance des ressources système
    describe('Tests de surveillance des ressources système', () => {
        it('Surveille l\'utilisation du CPU et de la mémoire pendant les tests', async () => {
            const duréeSurveillance = 30000;

            const métriques = [];

            const intervalle = setInterval(() => {

                const utilisationCpu = os.loadavg()[0];
                const utilisationMémoire = process.memoryUsage().heapUsed / 1024 / 1024;
                métriques.push({ cpu: utilisationCpu, mémoire: utilisationMémoire });
            }, 1000);

            await new Promise(resolve => setTimeout(resolve, duréeSurveillance));
            clearInterval(intervalle);

            const moyenneCpu = métriques.reduce((sum, m) => sum + m.cpu, 0) / métriques.length;

            const mémoireMax = Math.max(...métriques.map(m => m.mémoire));

            console.log(`Utilisation moyenne du CPU: ${moyenneCpu.toFixed(2)}%`);
            console.log(`Mémoire maximale utilisée: ${mémoireMax.toFixed(2)} Mo`);

            expect(moyenneCpu).toBeLessThan(80);
            expect(mémoireMax).toBeLessThan(1024);
        });
    });

    afterAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
    });
});
