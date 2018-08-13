#!/usr/bin/python3

# Credits:
# https://www.acmesystems.it/python_http
# http://joelinoff.com/blog/?p=1658

import socket
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import os
from urllib.parse import urlparse, parse_qs
import json
import glob

hostName = ""
hostPort = 8996

os.chdir("src")

class MyServer(BaseHTTPRequestHandler):
	#Handler for the GET requests
	def do_GET(self):
		path = urlparse(self.path)
		query = path.query
		allowed_filetypes = (".html", ".css", ".png", ".jpg",  ".gif", ".ico",".js")

		if self.path=="/":
			self.path="/index.html"
			self.do_index()
		elif self.path == '/getmaps':
			self.do_get_maps()
		elif path.path.endswith(allowed_filetypes):
			self.do_index()
		else:
			self.do_index()
		
		return None
	
	def do_get_maps(self):
		print("Going to get maps")
		files = glob.glob(os.curdir + "/maps/" + "*.json")
		print(glob.glob(os.curdir + "/maps/" + "*.json"))

		self.send_response(200)
		self.send_header('Content-type','text/json')
		self.end_headers()
		self.wfile.write(json.dumps(files).encode('utf-8'))
		return		
		
	# Credit: https://stackoverflow.com/questions/18346583/how-do-i-map-incoming-path-requests-when-using-httpserver
	# https://stackoverflow.com/questions/3474045/problems-with-my-basehttpserver
	# https://github.com/cuamckuu/NotesApp/blob/master/server.py
	# https://github.com/davesnowdon/nao-wanderer/blob/master/wanderer/src/main/python/wanderer/http.py
	# https://pymotw.com/3/http.server/index.html

	def do_index(self):
		try:
			#Check the file extension required and
			#set the right mime type

			sendReply = False
			if self.path.endswith(".html"):
				mimetype='text/html'
				sendReply = True
			if self.path.endswith(".jpg"):
				mimetype='image/jpg'
				sendReply = True
			if self.path.endswith(".gif"):
				mimetype='image/gif'
				sendReply = True
			if self.path.endswith(".png"):
				mimetype='image/png'
				sendReply = True
			if self.path.endswith(".js"):
				mimetype='application/javascript'
				sendReply = True
			if self.path.endswith(".css"):
				mimetype='text/css'
				sendReply = True

			if sendReply == True:
				#Open the static file requested and send it
				f = open(os.getcwd() + "/"+self.path, 'rb')
				self.send_response(200)
				self.send_header('Content-type',mimetype)
				self.end_headers()
				self.wfile.write(f.read())
				f.close()
			return


		except IOError:
			self.send_error(404,'File Not Found: %s' % self.path)

	#	POST is for submitting data.
	def do_POST(self):

		print( "incomming http: ", self.path )
		
		print("in post method")
		self.data_string = self.rfile.read(int(self.headers['Content-Length']))

		self.send_response(200)
		self.end_headers()

		data = json.loads(self.data_string)
		# print(data)
		print(data['title'])
		
		with open(os.curdir + "/maps/" + data['title']+".json", "w") as outfile:
			json.dump(data, outfile)

		self.send_response(200)
		self.send_header('Content-type','text/html')
		self.end_headers()
		self.wfile.write(b"Ok!")
		return


myServer = HTTPServer((hostName, hostPort), MyServer)
print(time.asctime(), "Server Starts - %s:%s" % (hostName, hostPort))

try:
	myServer.serve_forever()
except KeyboardInterrupt:
	pass

myServer.server_close()
print(time.asctime(), "Server Stops - %s:%s" % (hostName, hostPort))
