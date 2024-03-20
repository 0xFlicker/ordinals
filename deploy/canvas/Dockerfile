FROM public.ecr.aws/lambda/nodejs:20

#install the dependencies
RUN dnf -y update \
  && dnf install -y  gcc-c++ && dnf -y install findutils tar gzip gcc-c++ cairo-devel \
	libjpeg-turbo-devel pango-devel giflib-devel \ 
	zlib-devel librsvg2-devel

RUN npm i canvas

COPY index.mjs ./

ENV LD_PRELOAD=/var/task/node_modules/canvas/build/Release/libz.so.1
