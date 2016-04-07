#!/usr/bin/env bash -c make

SRC=./int64-array.js
TESTS=./test/*.js
HINTS=$(SRC) $(TESTS)
DIST=./dist
JSDEST=./dist/int64-array.min.js

all: test $(JSDEST)

clean:
	rm -fr $(JSDEST)

$(DIST):
	mkdir -p $(DIST)

$(JSDEST): $(SRC) $(DIST)
	./node_modules/.bin/uglifyjs $(SRC) -c -m -o $(JSDEST)
	ls -l $(JSDEST)

test:
	@if [ "x$(BROWSER)" = "x" ]; then make test-node; else make test-browser; fi

test-node: jshint mocha

test-browser:
	./node_modules/.bin/zuul -- $(TESTS)

test-browser-local:
	./node_modules/.bin/zuul --local 4000 -- $(TESTS)

mocha:
	./node_modules/.bin/mocha -R spec $(TESTS)

jshint:
	./node_modules/.bin/jshint $(HINTS)

.PHONY: all clean test jshint mocha
