const {log, biglog, errorlog, colorize} = require("./out");
const {models} = require("./model");
const Sequelize = require('sequelize');

const helpCmd = rl => {
	log("Commandos:");
	log("h|help - Muestra esta ayuda.");
 	log("list - Listar los quizzes existentes.");
 	log("show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
	log("add - Añadir un nuevo quiz interactivamente.");
	log("delete <id> - Borrar el quiz indicado.");
 	log("edit <id> - Editar el quiz indicado.");
 	log("test <id> - Probar el quiz indicado.");
 	log("p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
 	log("credits - Créditos.");
 	log("q|quit - Salir del programa.");
 	rl.prompt();
};

const makeQuestion = (rl, text) => {
	return new Sequelize.Promise(( resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};

const addCmd = rl => {
makeQuestion(rl, 'Introduzca una pregunta: ')
.then(q => {
	return makeQuestion(rl, 'Introduzca la respuesta: ')
	.then(a => {
		return {question: q, answer: a};
	});
})
.then(quiz => {
	return models.quiz.create(quiz);
})
.then((quiz) => {
	log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
})
.catch(Sequelize.ValidationError, error => {
	errorlog('El quiz es erroneo: ');
	error.errors.forEach(({message}) => errorlog(message));
})
.catch(error => {
	errorlog(error.message);
})
.then(() => {
	rl.prompt();
});
};

const listCmd = rl => {
	models.quiz.findAll()
	.each(quiz => {
		log(` [${colorize(quiz.id, 'magenta')}] ${quiz.question}`);
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const validateId = id =>{
	return new Sequelize.Promise((resolve,reject) => {
		if (typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>.`));
		} else {
			id = parseInt(id);
			if (Number.isNaN(id)) {
				reject(new Error(`El valor del parámetro <id> no es un número.`));
			} else {
				resolve(id);
			}
		}
	});
};

const showCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id= ${id}.`);
		}
		log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>')} ${quiz.answer}`); 
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const deleteCmd = (rl, id) => {
validateId(id)
.then(id => models.quiz.destroy({where: {id}}))
.catch(error => {
	errorlog(error.mesage);
})
.then(() => {
	rl.prompt();
})

};

const editCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) {
			throw new Error (`No existe un quiz asociado al id=${id}.`);
		}
		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
		return makeQuestion(rl, 'Introduzca la pregunta: ')
		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
			return makeQuestion(rl, 'Introduzca la respuesta: ')
			.then(a => {
				quiz.question = q;
				quiz.answer = a;
				return quiz;
			});
		});
	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorlog('El quiz es erroneo: ');
		error.errors.forEach(({message}) => errorlog(message));
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const testCmd = (rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if(!quiz) {
			throw new Error (`No existe un quiz asociado al id=${id}.`);
		}
		return makeQuestion(rl, `${quiz.question}:`)
		.then(a => {
			if(a.trim().toLowerCase()===quiz.answer.trim().toLowerCase()){
				biglog('CORRECTO', 'green');
			} else{
				biglog('INCORRECTO', 'red');
			}
		})
	})
	.catch(error => {
	errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

const playCmd = rl => {
	var preguntas = [];
	var i;
	models.quiz.count().then((count) => {
		if (count === 0)
			log("No hay nada que preguntar.", 'red');
		else{
			for(var a=1; a<=count;a++)
				preguntas.push(a);
			let score = 0;
			juega(rl, score, preguntas);
		}
	}).then(() => {
		rl.prompt();
	});
};

const creditsCmd = rl => {
	console.log("Autores de la práctica:");
    log("Marco Antonio Martín Herrera", 'green');
    rl.prompt();
};

const aleatorio = (min,max) => {
    return Math.floor(Math.random()*(max-min+1)+min);
};

const juega = (rl,score, preguntas) => {

var id =aleatorio(0,preguntas.length-1);
validateId(id)
	.then(id => models.quiz.findById(preguntas[id]))
	.then(quiz => {
		if(!quiz) {
			throw new Error (`No existe un quiz asociado al id=${id}.`);
		}
		return makeQuestion(rl, `${quiz.question}:`)
		.then(a => {
			if(a.trim().toLowerCase()===quiz.answer.trim().toLowerCase()){
				biglog('CORRECTO', 'green');
				score++;
				preguntas.splice(id,1);
				if(preguntas.length===0){
					biglog("¡HAS GANADO!", "yellow");
					console.log("Puntuación final: ");
					biglog(score, 'magenta');
				}else{
					console.log("Puntuación actual: ");
					biglog(score, 'magenta');
					juega(rl, score, preguntas);
				}
			} else{
				biglog('INCORRECTO', 'red');
				console.log("incorrect");
				console.log("Fin");
				console.log("Tu puntuación fue: ");
				biglog(score, 'magenta');
			}
		})
	})
	.catch(error => {
	errorlog(error.message);
	}).then(() => {
		rl.prompt();
	});
};


exports = module.exports = {
	aleatorio,
	creditsCmd,
	helpCmd,
	playCmd,
	showCmd,
	testCmd,
	editCmd,
	deleteCmd,
	listCmd,
	addCmd
};