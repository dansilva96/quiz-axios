(function() {
    let game, interval

    function clear() {
        game = {
            difficulty: undefined,
            category: undefined,
            category_name: undefined,
            token: undefined,
            type: undefined,
            question: undefined,
            answer: undefined,
            incorrect_answers: [],
            time: undefined,
            points: undefined,
            score: 0,
            lifes: 3,
            flag: 1,
            total_questions: 0,
            later: {
                flag: 1,
                type: undefined,
                question: undefined,
                answer: undefined,
                incorrect_answers: [],
            },
            setDifficulty: function (level) {
                this.difficulty = level

                if (this.difficulty === 'easy') {
                    this.time = 45
                    this.points = 5
                } else if (this.difficulty === 'medium') {
                    this.time = 30
                    this.points = 8
                } else {
                    this.time = 15
                    this.points = 10
                }
            },
            setQuestion: function (type, question, answer, incorrect) {
                this.type = type
                this.question = question
                this.answer = answer
                this.incorrect_answers = incorrect
            },
            setAnswerLater: function () {
                this.later.type = this.type
                this.later.question = this.question
                this.later.answer = this.answer
                this.later.incorrect_answers = this.incorrect_answers
            },
            answerSkipped: function () {
                this.setQuestion(this.later.type, this.later.question, this.later.answer, this.later.incorrect_answers)

                this.later.flag = 0
                this.later.type = undefined
                this.later.question = undefined
                this.later.answer = undefined
                this.later.incorrect_answers = undefined
            },
            checkAnswer: function (value) {
                if (value === this.answer) {
                    if (this.later.flag > 0) {
                        this.score += this.points
                    } else {
                        this.score += (this.points - 2)
                    }
                    return true
                } else {
                    this.score -= this.points
                    this.lifes--
                }
            }
        }
    }

    async function getToken() {
        try {
            const res = await axios.get('https://opentdb.com/api_token.php?command=request')
            game.token = res.data.token
        } catch (err) {
            console.error(`Error: ${err.message}`)
        }

        console.log(game.token)
    }

    async function resetToken() {
        try {
            const res = await axios.get(`https://opentdb.com/api_token.php?command=reset&token=${game.token}`)
            game.token = res.data.token
        } catch (err) {
            console.error(`Error: ${err.message}`)
        }
    }

    function getCategories() {
        document.querySelector('#choose-level').style.display = 'none'
        document.querySelector('#choose-category').style.display = 'flex'

        axios.get('https://opentdb.com/api_category.php')
            .then(res => {
                const select = document.querySelector('.select-category')
                const categories = res.data.trivia_categories

                for (const cat of categories) {
                    const option = `<option value="${cat.id}">${cat.name}</option>`
                    select.innerHTML += option
                }
            })
            .catch(err => {
                console.error(`Error: ${err.message}`)
            })
    }

    async function startGame() {
        await getToken()

        const op = document.querySelector('.select-category')

        game.category = op.value
        op.value == 0 ? game.category_name = 'Random' :
            game.category_name = op.options[op.selectedIndex].textContent

        document.querySelector('#choose-category').style.display = 'none'
        document.querySelector('#game').style.display = 'flex'

        await getQuestion()
        updateQuestion()
        updateTimer()
        updateScore()
    }

    async function getQuestion() {
        try {
            const res = await axios.get(`https://opentdb.com/api.php?amount=1&category=${game.category}&difficulty=${game.difficulty}&token=${game.token}`)

            const code = res.data.response_code
            const result = res.data.results[0]

            if (code === 0) {
                console.log(result.correct_answer)
                game.setQuestion(result.type, result.question, result.correct_answer, result.incorrect_answers)
            }
            else if (code === 4) {
                await resetToken()
                await getQuestion()
                updateQuestion()
            }
        } catch (err) {
            console.error(`Error: ${err.message}`)
        }
    }

    function updateQuestion() {
        document.querySelector('.current-question').innerHTML = game.question

        if (game.type === 'multiple') {
            document.querySelector('.ag-boolean').style.display = 'none'
            document.querySelector('.ag-multiple').style.display = 'flex'

            updateAlternatives()
        } else {
            document.querySelector('.ag-multiple').style.display = 'none'
            document.querySelector('.ag-boolean').style.display = 'flex'
        }

        game.flag = 1
    }

    function updateAlternatives() {
        const array = [game.answer, ...game.incorrect_answers]

        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }

        document.querySelectorAll('.alt-button').forEach((btn, i) => {
            btn.value = array[i]
            btn.innerHTML = array[i]
        })
    }

    function updateScore() {
        document.querySelector('.score').textContent = game.score
    }

    function updateTimer() {
        const timer = document.querySelector('.timer')
        let time = game.time
        timer.textContent = time

        interval = setInterval(function () {
            time--;
            timer.textContent = time;
            if (time <= 0) {
                checkAnswer()
                clearInterval(interval);
            }
        }, 1000);
    }

    function checkAnswer(value, btnPressed) {
        if (game.flag > 0) {
            const buttons = document.querySelectorAll('.answer-button')

            if (game.checkAnswer(value)) {
                btnPressed.setAttribute('id', 'correct')
            } else {
                document.querySelectorAll('.lifes img').forEach((lf, i) => {
                    if (game.lifes === i) {
                        lf.style.display = 'none'
                    }
                })

                if (btnPressed) {
                    btnPressed.setAttribute('id', 'incorrect')
                } else {
                    buttons.forEach(btn => {
                        btn.setAttribute('id', 'incorrect')
                    })
                }
            }

            updateScore()

            if (value) {
                buttons.forEach(btn => {
                    if (btn.value === game.answer) {
                        btn.setAttribute('id', 'correct')
                    }
                })
            }

            clearInterval(interval)

            document.querySelector('.answerlater-button').style.display = 'none'
            document.querySelector('.skipped-button').style.display = 'block'
            document.querySelector('.next-button').style.display = 'block'

            game.flag = 0
            game.total_questions++

            if (game.lifes === 0) {
                document.querySelector('.skipped-button').style.display = 'none'
                document.querySelector('.next-button').style.display = 'none'

                document.querySelector('.end-button').style.display = 'block'
            }
        }
    }

    async function answerLater() {
        if (!game.later.question) {
            game.setAnswerLater()

            clearInterval(interval)

            await getQuestion()
            updateQuestion()
            updateTimer()
            updateScore()
        } else {
            document.querySelector('#message').style.display = 'flex'
            document.querySelector('#message p').textContent = `You already skip a question`
        }
    }

    function answerSkipped() {
        if (game.later.question) {
            game.answerSkipped()

            clearInterval(interval)

            document.querySelector('.answerlater-button').style.display = 'block'
            document.querySelector('.skipped-button').style.display = 'none'
            document.querySelector('.next-button').style.display = 'none'

            document.querySelectorAll('.answer-button').forEach(btn => {
                btn.removeAttribute('id')
            })

            updateQuestion()
            updateTimer()
            updateScore()
        } else {
            document.querySelector('#message').style.display = 'flex'
            document.querySelector('#message p').textContent = `You still don't skip a question`
        }
    }

    async function nextQuestion() {
        document.querySelector('#message').style.display = 'none'
        document.querySelector('.skipped-button').style.display = 'none'
        document.querySelector('.next-button').style.display = 'none'
        document.querySelector('.answerlater-button').style.display = 'block'

        document.querySelectorAll('.answer-button').forEach(btn => {
            btn.removeAttribute('id')
        })

        await getQuestion()
        updateQuestion()
        updateTimer()
        updateScore()
        game.later.flag = 1
    }

    function finalGame() {
        const results = document.querySelectorAll('.results')

        results[0].textContent = `Difficulty: ${game.difficulty}`
        results[1].textContent = `Category: ${game.category_name}`
        results[2].textContent = `Total questions: ${game.total_questions}`
        results[3].textContent = `Score: ${game.score}`


        document.querySelector('#message').style.display = 'none'
        document.querySelector('#game').style.display = 'none'
        document.querySelector('#end-game').style.display = 'flex'
    }

    document.querySelectorAll('.answer-button').forEach(btn => {
        btn.addEventListener('click', function () {
            checkAnswer(this.value, this)
        })
    })

    document.querySelector('.easy-button').addEventListener('click', () => {
        getCategories()
        game.setDifficulty('easy')
    })

    document.querySelector('.med-button').addEventListener('click', () => {
        getCategories()
        game.setDifficulty('medium')
    })

    document.querySelector('.hard-button').addEventListener('click', () => {
        getCategories()
        game.setDifficulty('hard')
    })

    document.querySelector('.game-button').addEventListener('click', () => {
        startGame()
    })

    document.querySelector('.answerlater-button').addEventListener('click', () => {
        answerLater()
    })

    document.querySelector('.skipped-button').addEventListener('click', () => {
        answerSkipped()
    })

    document.querySelector('.next-button').addEventListener('click', () => {
        nextQuestion()
    })

    document.querySelector('.end-button').addEventListener('click', () => {
        finalGame()
    })

    document.querySelector('.again-button').addEventListener('click', () => {
        document.querySelector('.answerlater-button').style.display = 'block'

        document.querySelectorAll('.lifes img').forEach((lf, i) => {
            lf.style.display = 'inline-block'
        })

        document.querySelectorAll('.answer-button').forEach(btn => {
            btn.removeAttribute('id')
        })

        document.querySelector('.end-button').style.display = 'none'
        document.querySelector('#end-game').style.display = 'none'
        document.querySelector('#choose-level').style.display = 'flex'

        clear()

        updateAlternatives()
        updateQuestion()
        updateScore()
    })

    document.querySelector('.close-button').addEventListener('click', () => {
        document.querySelector('#message').style.display = 'none'
    })

    clear()
})()