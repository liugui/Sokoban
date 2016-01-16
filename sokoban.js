(function() {
    // Handle events
    var events = require('events'),
        emitter = new events.EventEmitter();

    var Point = function(x, y) {
        this.x = x;
        this.y = y;
    };

    // Handle input
    var InputController = function() {

        var keypress = require('keypress');

        this.listenStatus = false;

        this.inputCallback;

        this.getListenStatus = function() {
            return this.listenStatus;
        };

        this.startListen = function() {
        	var self = this;
            this.listenStatus = true;
            keypress(process.stdin);
            process.stdin.on('keypress', function(ch, key) {
                // self.inputCallback(key.name);
                // console.log('got "keypress"', key);
                // if (key && key.ctrl && key.name == 'c') {
                //     process.stdin.pause();
                // }
                emitter.emit('input', key.name);
            });
            process.stdin.setRawMode(true);
            process.stdin.resume();
        };

        this.stopListen = function() {
            this.listenStatus = false;
            process.stdin.pause();
        };
    };

    // Handle Level
    var LevelHandler = function() {
        this.level = 1;

        this.getLevel = function() {
            return this.level
        };

        // TODO: select level
        this.setLevel = function(level) {
            this.level = level;
        };

        this.readLevelTxt = function() {
            // TODO
            // 1-># 0->'' 2->p 3->box 4->target
            this.width = 10;

            this.originArray = ['#', '#', '#', '#', '#', '#', '#', '#', '#', '#', '#', ' ', ' ', ' ', '#', '#', ' ', ' ', ' ', '#', '#', '#', 'p', 'b', ' ', ' ', '0', ' ', ' ', '#', '#', ' ', ' ', ' ', ' ', ' ', ' ', '#', ' ', '#', '#', '#', '#', '#', '#', '#', '#', '#', '#', '#'];
            // LogicArray is used in the whole game
            this.logicArray = toolObject.getTransformArray(this.originArray, this.width);
        };
    };

    // Handle output
    var OutputController = function() {
        this.showResults = function(array, width) {
            if (array.length && array[0] instanceof Array) {
                this.showTwoArrayResults(array);
            } else if (array.length && typeof array[0] != 'object') {
                this.showOneArrayResults(array, width);
            };
        };

        this.showTwoArrayResults = function(array) {
            array.forEach(function(elem) {
                process.stdout.write(elem.join('') + '\n')
            });
        };

        this.showOneArrayResults = function() {

        }
    };

    var GameObject = function(x, y) {
        this.x = x;
        this.y = y;
    };

    var MoveablGameObject = function(x, y) {
        GameObject.call(this, x, y);
    };

    MoveablGameObject.prototype = {
        getTargetPos: function(direction) {
            switch (direction) {
                case 'up':
                    return new Point(this.x - 1, this.y);
                case 'down':
                    return new Point(this.x + 1, this.y);
                case 'left':
                    return new Point(this.x, this.y - 1);
                case 'right':
                    return new Point(this.x, this.y + 1);
            }
        },
    };

    var Person = function(pos) {
        this.type = 'p'
        MoveablGameObject.call(this, pos.x, pos.y);
    };

    inheritPrototype(Person, MoveablGameObject);

    var Box = function(pos) {
        this.type = 'b';
        MoveablGameObject.call(this, pos.x, pos.y);
    };

    inheritPrototype(Box, MoveablGameObject);

    var UnMoveableGameObject = function(x, y) {
        GameObject.call(this, x, y);
    };

    inheritPrototype(MoveablGameObject, GameObject);

    var Target = function(pos) {
        this.type = '0';
        UnMoveableGameObject.call(this, pos.x, pos.y);
    };

    var Wall = function() {

    };

    // main game logic
    var GameLogic = function() {
        this.statusArray = [];
        this.restTargetNum = 10;
        this.person;
        this.boxes = []; // an Array to store Boxes Object
        this.targets = [];

        this.setStatusArray = function(array) {
            this.statusArray = array;
        };

        this.setRestTargetNum = function() {
            this.restTargetNum = toolObject.getGameObjectNum(this.statusArray, '0');
        };

        this.setBoxes = function(pos, boxObject) {
            this.boxes[pos.x] = [];
            this.boxes[pos.x][pos.y] = boxObject;
        };

        this.setTargets = function(pos, targetObject) {
            this.targets[pos.x] = [];
            this.targets[pos.x][pos.y] = targetObject;
        };

        this.setBoxPos = function(x, y, value) {
            this.boxes[x][y] = null;
            this.boxes[value.x] = [];
            this.boxes[value.x][value.y] = new Box(value);
        };

        this.changeStatusArray = function(pos, value) {
            this.statusArray[pos.x][pos.y] = value;
        };

        this.handlMove = function(direction) {
            var checkMoveResult = this.checkIfCanMove(direction);
            checkMoveResult.currentPersonPos = new Point(this.person.x, this.person.y);
            if (checkMoveResult.canMove) { // if can move
                var resetPersonPosVal = ' ';
                this.changeStatusArray(checkMoveResult.nextPos, 'p');
                if (this.targets[this.person.x] && this.targets[this.person.x][this.person.y]) {
                    resetPersonPosVal = '0';
                }
                this.changeStatusArray(checkMoveResult.currentPersonPos, resetPersonPosVal);
                this.person.x = checkMoveResult.nextPos.x;
                this.person.y = checkMoveResult.nextPos.y; // update person's position
                if (checkMoveResult.moveWithBox) {
                    this.changeStatusArray(checkMoveResult.nextNextPos, 'b');
                    this.setBoxPos(checkMoveResult.nextPos.x, checkMoveResult.nextPos.y, checkMoveResult.nextNextPos);
                    if (checkMoveResult.canMove == 'moveToTarget') {
                        this.restTargetNum--;
                    } else if(this.targets[checkMoveResult.nextPos.x][checkMoveResult.nextPos.y]) {// move a box off a target
                        this.restTargetNum++;
                    }
                }
                console.log(this.restTargetNum);
                if (this.checkSuccess()) {
                    console.log('success');
                } else {
                    emitter.emit('print');
                }
            }
        };

        this.checkIfCanMove = function(direction) {
            var nextPos = this.person.getTargetPos(direction),
                nextType = this.statusArray[nextPos.x][nextPos.y],
                nextNextPos,
                nextNextType,
                canMove,
                moveWithBox;
            if (nextType === 'b') { // if next is a box, then check the next of the next position
                var nextNextPos = this.boxes[nextPos.x][nextPos.y].getTargetPos(direction),
                    nextNextType = this.statusArray[nextNextPos.x][nextNextPos.y];
                moveWithBox = (canMove = this.checkNextMoveStatus(nextNextType, false)) ? true : false;
            } else {
                canMove = this.checkNextMoveStatus(nextType, true);
            }
            return {
                canMove: canMove,
                moveWithBox: moveWithBox,
                nextPos: nextPos,
                nextNextPos: nextNextPos
            };
        };

        this.checkNextMoveStatus = function(nextType, firstBox) {
            if (nextType === ' ') {
                return 'moveToEmpty';
            } else if (nextType === '0') {
                return 'moveToTarget'
            } else if (nextType === '#') {
                return false;
            } else if (nextType === 'b' && !firstBox) { // two boxes
                return false;
            }
        };

        this.checkSuccess = function() {
            return this.restTargetNum == 0 ? true : false;
        }
    };

    // tools
    var toolObject = {
        // transform between one dimension array and two dimension array
        getTransformArray: function(array, width) {
            var result = [];
            if (width && typeof array[0] != 'object' && array.length) {
                while (array.length) {
                    result.push(array.splice(0, width)); // splice return an array, and change the origin array
                }
            } else if (array[0] instanceof Array && array.length) {
                array.forEach(function(elem) {
                    result = result.concat(elem);
                });
            }
            return result;
        },

        getGameObjectNum: function(array, objectChar) {
            var charNum = 0;
            array.forEach(function(value) {
                value.forEach(function(_value) {
                    if (_value === objectChar) {
                        charNum++;
                    }
                });
            });
            return charNum;
        },

        getGameObjectPos: function(array, objectchar) {
            var results = [];
            array.forEach(function(value, x) {
                value.forEach(function(_value, y) {
                    if (_value === objectchar) {
                        results.push(new Point(x, y));
                    }
                });
            });
            return objectchar == 'p' ? results[0] : results; // only one pserson but maybe more than one box 
        },
    };

    function inheritObject(o) {
        function F() {};
        F.prototype = o;
        return new F();
    };

    function inheritPrototype(subClass, superClass) {
        var p = inheritObject(superClass.prototype);
        p.constructor = subClass;
        subClass.prototype = p;
    };

    var Sokoban = function() {
        var levelHandler = new LevelHandler(),
            output = new OutputController(),
            input = new InputController(),
            gameLogic = new GameLogic();

        this.startGame = function() {
            levelHandler.readLevelTxt();
            gameLogic.setStatusArray(levelHandler.logicArray);
            gameLogic.setRestTargetNum();
            output.showResults(gameLogic.statusArray);
            gameLogic.person = new Person(toolObject.getGameObjectPos(gameLogic.statusArray, 'p'));
            toolObject.getGameObjectPos(gameLogic.statusArray, 'b').forEach(function(elem) {
                gameLogic.setBoxes(elem, new Box(elem));
            });
            toolObject.getGameObjectPos(gameLogic.statusArray, '0').forEach(function(elem) {
                gameLogic.setTargets(elem, new Target(elem));
            });
            input.startListen();
            emitter.on('input', function(direction){
            	gameLogic.handlMove.call(gameLogic, direction)
            });
            emitter.on('print', function() {
                output.showResults(gameLogic.statusArray);
            })
        }
    };

    // execute
    var sokoban = new Sokoban();
    sokoban.startGame();

})();
