# /***** < ivan *****/
QT += core network

DEPENDPATH += $$PWD

HEADERS += $$PWD/qamqpchannel_p.h \
           $$PWD/qamqpclient_p.h \
           $$PWD/qamqpexchange_p.h \
           $$PWD/qamqpframe_p.h \
           $$PWD/qamqpmessage_p.h \
           $$PWD/qamqpqueue_p.h \
           $$PWD/qamqpauthenticator.h \
           $$PWD/qamqpchannel.h \
           $$PWD/qamqpclient.h \
           $$PWD/qamqpexchange.h \
           $$PWD/qamqpglobal.h \
           $$PWD/qamqpmessage.h \
           $$PWD/qamqpqueue.h \
           $$PWD/qamqptable.h
           
           
SOURCES += $$PWD/qamqpauthenticator.cpp \
           $$PWD/qamqpchannel.cpp \
           $$PWD/qamqpclient.cpp \
           $$PWD/qamqpexchange.cpp \
           $$PWD/qamqpframe.cpp \
           $$PWD/qamqpmessage.cpp \
           $$PWD/qamqpqueue.cpp \
           $$PWD/qamqptable.cpp
# /***** ivan > *****/
